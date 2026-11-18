import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface AtmosphereSceneProps {
  scrollProgressRef: MutableRefObject<number>;
  aqiRef: MutableRefObject<number>;
  aiStreamingRef: MutableRefObject<boolean>;
  pointerRef: MutableRefObject<{ x: number; y: number }>;
}

// Pre-allocated scratch helpers outside useFrame (zero GC pressure)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, -0.1, 0);
const _amberColor = new THREE.Color('#F59E0B');
const _coralColor = new THREE.Color('#FB7185');
const _cleanColor = new THREE.Color('#34D399');
const _coreMixColor = new THREE.Color();
const _beaconMixColor = new THREE.Color();
const _dummyMatrix = new THREE.Object3D();

const PARTICLE_COUNT = 2200;
const TOWER_COUNT = 64;

function detectSoftwareRenderer(gl: THREE.WebGLRenderer): boolean {
  try {
    const context = gl.getContext();
    const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const rendererName = String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererName)) {
        return true;
      }
    }
  } catch {
    // Ignore debug extension check failures
  }
  return false;
}

function createMicroGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#505050';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#b5b5b5';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0.92)');
    grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.45)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

interface SceneRigProps extends AtmosphereSceneProps {
  isSoftwareGl: boolean;
  reducedMotion: boolean;
}

function AtmosphereRig({
  scrollProgressRef,
  aqiRef,
  aiStreamingRef,
  pointerRef,
  isSoftwareGl,
  reducedMotion,
}: SceneRigProps) {
  const { gl, scene, camera } = useThree();

  const arrayGroupRef = useRef<THREE.Group>(null);
  const outerSphereRef = useRef<THREE.Mesh>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const gimbalRingRef = useRef<THREE.Mesh>(null);
  const polarRingRef = useRef<THREE.Mesh>(null);
  const sensorRigRef = useRef<THREE.Group>(null);
  const inversionLayerRef = useRef<THREE.Group>(null);
  const skylineGroupRef = useRef<THREE.Group>(null);
  const towerMeshRef = useRef<THREE.InstancedMesh>(null);
  const towerEmissiveRef = useRef<THREE.InstancedMesh>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const cursorLightRef = useRef<THREE.PointLight>(null);

  const sphereUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBreath: { value: 0 },
      uTurbulence: { value: 0.4 },
    }),
    []
  );

  // Studio PBR Reflections (RoomEnvironment + PMREMGenerator) & Slate-950 Horizon Fog
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    scene.fog = new THREE.FogExp2('#020617', 0.032);

    return () => {
      scene.environment = null;
      envRT.dispose();
      roomEnv.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  const { gridTexture, shadowTexture, gimbalGeometry, pedestalGeometry } = useMemo(() => {
    const gridTex = createMicroGridTexture();
    const shadowTex = createContactShadowTexture();

    // Machined LatheGeometry profile for equatorial telemetry gimbal ring
    const gimbalPoints = [
      new THREE.Vector2(2.18, -0.06),
      new THREE.Vector2(2.36, -0.045),
      new THREE.Vector2(2.42, 0),
      new THREE.Vector2(2.36, 0.045),
      new THREE.Vector2(2.18, 0.06),
      new THREE.Vector2(2.14, 0),
      new THREE.Vector2(2.18, -0.06),
    ];
    const gimbalGeo = new THREE.LatheGeometry(gimbalPoints, 64);

    // Stepped telemetry pedestal anchored flush with ground (y = 0 local pivot)
    const pedestalPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(1.45, 0.0),
      new THREE.Vector2(1.38, 0.16),
      new THREE.Vector2(1.02, 0.24),
      new THREE.Vector2(0.95, 0.42),
      new THREE.Vector2(0.55, 0.56),
      new THREE.Vector2(0.0, 0.58),
    ];
    const pedestalGeo = new THREE.LatheGeometry(pedestalPoints, 48);

    return {
      gridTexture: gridTex,
      shadowTexture: shadowTex,
      gimbalGeometry: gimbalGeo,
      pedestalGeometry: pedestalGeo,
    };
  }, []);

  // Organic displaced physical material for the atmospheric telemetry shell
  const outerSphereMaterial = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#94A3B8'),
      emissive: new THREE.Color('#1E293B'),
      emissiveIntensity: 0.28,
      roughness: 0.18,
      roughnessMap: gridTexture,
      bumpMap: gridTexture,
      bumpScale: 0.015,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      ior: 1.42,
      thickness: isSoftwareGl ? 0 : 1.1,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: isSoftwareGl ? 0.52 : 0.88,
      envMapIntensity: 1.35,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = sphereUniforms.uTime;
      shader.uniforms.uBreath = sphereUniforms.uBreath;
      shader.uniforms.uTurbulence = sphereUniforms.uTurbulence;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uTime;
          uniform float uBreath;
          uniform float uTurbulence;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float waveA = sin(position.x * 2.3 + uTime * 0.65) * cos(position.y * 2.0 - uTime * 0.5);
          float waveB = sin(position.z * 2.6 + uTime * 0.45) * 0.5;
          float organicDisp = (waveA + waveB) * (0.04 + uTurbulence * 0.05) + uBreath * 0.05;
          transformed += normal * organicDisp;`
        );
    };
    mat.customProgramCacheKey = () => (isSoftwareGl ? 'retro-sphere-sw' : 'retro-sphere-hw');
    return mat;
  }, [gridTexture, isSoftwareGl, sphereUniforms]);

  // 2,200 Cursor-Reactive Particulate Motes (Amber/Coral warning -> Emerald clean)
  const { particleGeometry, particleMaterial } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const scales = new Float32Array(PARTICLE_COUNT);
    const seeds = new Float32Array(PARTICLE_COUNT);
    const layers = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const radius = 2.6 + Math.pow(Math.random(), 0.72) * 11.5;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.72 + (Math.random() - 0.5) * 2.4;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 0.6;

      scales[i] = 0.45 + Math.random() * 1.6;
      seeds[i] = Math.random() * 100.0;
      layers[i] = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute('aLayer', new THREE.BufferAttribute(layers, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uBreath: { value: 0 },
        uScroll: { value: 0 },
        uSmogRatio: { value: 0.68 },
        uAiBurst: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: `
        attribute float aScale;
        attribute float aSeed;
        attribute float aLayer;

        uniform float uTime;
        uniform float uBreath;
        uniform float uScroll;
        uniform float uAiBurst;
        uniform vec2 uPointer;
        uniform float uPixelRatio;

        varying float vAlpha;
        varying float vLayer;
        varying float vBurst;

        void main() {
          vec3 pos = position;
          float driftSpeed = 0.16 + aLayer * 0.14;
          pos.x += sin(uTime * driftSpeed + aSeed) * (0.28 + aLayer * 0.24);
          pos.y += cos(uTime * driftSpeed * 0.85 + aSeed * 1.3) * 0.22 + uBreath * 0.12;
          pos.z += sin(uTime * driftSpeed * 0.6 + aSeed * 0.7) * 0.24;

          vec3 dir = normalize(pos + vec3(0.0001));
          pos += dir * uBreath * (0.1 + aLayer * 0.16);

          vec2 cursorWorld = uPointer * vec2(4.8, 3.0);
          vec2 toCursor = pos.xy - cursorWorld;
          float dist = length(toCursor);
          float wake = smoothstep(3.6, 0.0, dist);
          pos.xy += normalize(toCursor + vec2(0.001)) * wake * 0.52;
          pos.z += wake * 0.35;

          float burstWave = sin(length(pos) * 1.8 - uTime * 4.5);
          pos += dir * (uAiBurst * burstWave * 0.24);
          pos.y += (uScroll - 0.35) * 1.0 * (aLayer - 0.4);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float baseSize = (18.0 + aScale * 18.0) * uPixelRatio;
          baseSize *= (1.0 + uAiBurst * 0.48);
          gl_PointSize = clamp(baseSize / max(-mvPosition.z, 1.5), 1.5, 22.0);

          vAlpha = smoothstep(22.0, 4.0, -mvPosition.z) * (0.35 + aLayer * 0.5);
          vLayer = aLayer;
          vBurst = uAiBurst * (0.5 + 0.5 * burstWave);
        }
      `,
      fragmentShader: `
        uniform float uSmogRatio;
        uniform float uScroll;

        varying float vAlpha;
        varying float vLayer;
        varying float vBurst;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;

          float core = smoothstep(0.5, 0.04, d);
          core = pow(core, 1.75);

          vec3 amberWarn = vec3(0.96, 0.62, 0.04);
          vec3 coralAlert = vec3(0.98, 0.44, 0.52);
          vec3 cleanEmerald = vec3(0.20, 0.83, 0.60);

          float cleanProgress = clamp(uScroll * 1.15 - 0.15, 0.0, 1.0);
          float smogMix = clamp(uSmogRatio * (1.0 - cleanProgress * 0.72), 0.0, 1.0);

          vec3 warnTint = mix(amberWarn, coralAlert, smoothstep(0.55, 1.0, vLayer) * 0.65);
          vec3 baseCol = mix(cleanEmerald, warnTint, smogMix * (0.55 + vLayer * 0.45));
          baseCol += vec3(0.25, 0.18, 0.05) * vBurst;

          gl_FragColor = vec4(baseCol, core * vAlpha * 0.82);
        }
      `,
    });

    return { particleGeometry: geo, particleMaterial: mat };
  }, [isSoftwareGl]);

  // Procedural 3D Urban Skyline Basin
  const towerData = useMemo(() => {
    const items: Array<{ x: number; z: number; w: number; d: number; h: number }> = [];
    for (let i = 0; i < TOWER_COUNT; i++) {
      const angle = (i / TOWER_COUNT) * Math.PI * 2 + (i % 3) * 0.08;
      const ringRadius = 5.6 + (i % 4) * 1.45 + ((i * 7) % 11) * 0.12;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius - 1.2;
      const w = 0.28 + ((i * 13) % 7) * 0.065;
      const d = 0.28 + ((i * 17) % 5) * 0.07;
      const h = 0.9 + ((i * 23) % 19) * 0.18;
      items.push({ x, z, w, d, h });
    }
    return items;
  }, []);

  useEffect(() => {
    const mesh = towerMeshRef.current;
    const beaconMesh = towerEmissiveRef.current;
    if (!mesh || !beaconMesh) return;

    towerData.forEach((t, idx) => {
      _dummyMatrix.position.set(t.x, t.h * 0.5 - 3.65, t.z);
      _dummyMatrix.scale.set(t.w, t.h, t.d);
      _dummyMatrix.rotation.set(0, (idx * 0.37) % Math.PI, 0);
      _dummyMatrix.updateMatrix();
      mesh.setMatrixAt(idx, _dummyMatrix.matrix);

      _dummyMatrix.position.set(t.x, t.h - 3.6, t.z);
      _dummyMatrix.scale.set(0.068, 0.032, 0.068);
      _dummyMatrix.updateMatrix();
      beaconMesh.setMatrixAt(idx, _dummyMatrix.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    beaconMesh.instanceMatrix.needsUpdate = true;
  }, [towerData]);

  useEffect(() => {
    return () => {
      gridTexture.dispose();
      shadowTexture.dispose();
      gimbalGeometry.dispose();
      pedestalGeometry.dispose();
      outerSphereMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, [
    gridTexture,
    shadowTexture,
    gimbalGeometry,
    pedestalGeometry,
    outerSphereMaterial,
    particleGeometry,
    particleMaterial,
  ]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    const scroll = scrollProgressRef.current;
    const aqi = aqiRef.current;
    const streaming = aiStreamingRef.current;
    const pointer = pointerRef.current;

    const breath = reducedMotion ? 0.2 : Math.sin(t * ((Math.PI * 2) / 7.5)) * 0.5 + 0.5;
    const smogRatio = THREE.MathUtils.clamp((aqi - 60) / 300, 0.14, 1.0);
    const cleanProgress = THREE.MathUtils.clamp((scroll - 0.58) / 0.38, 0, 1);

    sphereUniforms.uTime.value = t;
    sphereUniforms.uBreath.value = THREE.MathUtils.damp(
      sphereUniforms.uBreath.value,
      breath,
      3.5,
      dt
    );
    sphereUniforms.uTurbulence.value = THREE.MathUtils.damp(
      sphereUniforms.uTurbulence.value,
      smogRatio * (1 - cleanProgress * 0.65),
      2.8,
      dt
    );

    particleMaterial.uniforms.uTime.value = t;
    particleMaterial.uniforms.uBreath.value = sphereUniforms.uBreath.value;
    particleMaterial.uniforms.uScroll.value = THREE.MathUtils.damp(
      particleMaterial.uniforms.uScroll.value,
      scroll,
      4.0,
      dt
    );
    particleMaterial.uniforms.uSmogRatio.value = THREE.MathUtils.damp(
      particleMaterial.uniforms.uSmogRatio.value,
      smogRatio,
      2.5,
      dt
    );
    particleMaterial.uniforms.uAiBurst.value = THREE.MathUtils.damp(
      particleMaterial.uniforms.uAiBurst.value,
      streaming ? 1.0 : 0.0,
      4.5,
      dt
    );
    particleMaterial.uniforms.uPointer.value.x = THREE.MathUtils.damp(
      particleMaterial.uniforms.uPointer.value.x,
      pointer.x,
      5.0,
      dt
    );
    particleMaterial.uniforms.uPointer.value.y = THREE.MathUtils.damp(
      particleMaterial.uniforms.uPointer.value.y,
      pointer.y,
      5.0,
      dt
    );

    const dampFactor = 1 - Math.exp(-3.2 * dt);

    _coreMixColor.copy(_amberColor).lerp(_coralColor, smogRatio * 0.65);
    _coreMixColor.lerp(_cleanColor, cleanProgress * 0.8);

    if (innerCoreRef.current) {
      const innerMat = innerCoreRef.current.material as THREE.MeshStandardMaterial;
      innerMat.emissive.lerp(_coreMixColor, dampFactor);
      innerMat.emissiveIntensity = 0.9 + breath * 0.45 + (streaming ? 0.65 : 0);
      innerCoreRef.current.scale.setScalar(1 + breath * 0.06 + (streaming ? 0.05 : 0));
      innerCoreRef.current.rotation.y = -t * 0.16;
    }

    if (outerSphereRef.current) {
      outerSphereRef.current.rotation.y = t * 0.08 + pointer.x * 0.18;
      outerSphereRef.current.rotation.x = Math.sin(t * 0.2) * 0.08 + pointer.y * 0.12;
    }

    if (gimbalRingRef.current) {
      gimbalRingRef.current.rotation.y = -t * 0.14;
      gimbalRingRef.current.rotation.z = Math.sin(t * 0.22) * 0.08;
    }

    if (polarRingRef.current) {
      polarRingRef.current.rotation.z = t * 0.12;
      polarRingRef.current.rotation.x = 1.08 + Math.cos(t * 0.2) * 0.06;
    }

    if (sensorRigRef.current) {
      sensorRigRef.current.rotation.y = t * 0.1;
    }

    if (inversionLayerRef.current) {
      const vis =
        THREE.MathUtils.smoothstep(scroll, 0.06, 0.24) *
        (1 - THREE.MathUtils.smoothstep(scroll, 0.48, 0.85));
      inversionLayerRef.current.position.y = THREE.MathUtils.damp(
        inversionLayerRef.current.position.y,
        -1.25 + cleanProgress * 2.0,
        2.5,
        dt
      );
      inversionLayerRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = vis * (idx === 0 ? 0.22 : 0.14);
        mesh.rotation.z = t * (idx === 0 ? 0.04 : -0.03);
      });
    }

    if (skylineGroupRef.current) {
      const lift =
        THREE.MathUtils.smoothstep(scroll, 0.05, 0.24) * 0.9 +
        THREE.MathUtils.smoothstep(scroll, 0.65, 0.9) * 0.5;
      skylineGroupRef.current.position.y = THREE.MathUtils.damp(
        skylineGroupRef.current.position.y,
        -2.55 + lift * 1.0,
        2.6,
        dt
      );
      skylineGroupRef.current.rotation.y = t * 0.02 + scroll * 0.7;

      if (towerEmissiveRef.current) {
        const beaconMat = towerEmissiveRef.current.material as THREE.MeshBasicMaterial;
        _beaconMixColor.copy(_coralColor).lerp(_amberColor, 0.4).lerp(_cleanColor, cleanProgress);
        beaconMat.color.lerp(_beaconMixColor, dampFactor);
      }
    }

    if (arrayGroupRef.current) {
      const targetX =
        scroll < 0.16 ? 1.95 : scroll < 0.48 ? 2.15 : scroll < 0.78 ? -1.95 : 0;
      const targetScale = scroll < 0.16 ? 0.94 : scroll > 0.84 ? 1.02 : 0.82;

      arrayGroupRef.current.position.x = THREE.MathUtils.damp(
        arrayGroupRef.current.position.x,
        targetX + pointer.x * 0.2,
        2.4,
        dt
      );
      arrayGroupRef.current.position.y = THREE.MathUtils.damp(
        arrayGroupRef.current.position.y,
        0.18 + pointer.y * 0.14,
        2.4,
        dt
      );
      const nextScale = THREE.MathUtils.damp(arrayGroupRef.current.scale.x, targetScale, 2.4, dt);
      arrayGroupRef.current.scale.setScalar(nextScale);
    }

    if (cursorLightRef.current) {
      cursorLightRef.current.position.x = THREE.MathUtils.damp(
        cursorLightRef.current.position.x,
        pointer.x * 5.2,
        4.0,
        dt
      );
      cursorLightRef.current.position.y = THREE.MathUtils.damp(
        cursorLightRef.current.position.y,
        pointer.y * 3.2 + 0.4,
        4.0,
        dt
      );
    }

    if (keyLightRef.current) {
      keyLightRef.current.intensity = 2.25 + cleanProgress * 0.95;
    }

    const camZ = 8.6 - Math.sin(scroll * Math.PI) * 1.1;
    const camY = 0.4 + scroll * 0.6;
    _targetCamPos.set(pointer.x * 0.45, camY + pointer.y * 0.25, camZ);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 3.0, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 3.0, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 3.0, dt);

    _targetLookAt.set(pointer.x * 0.14, -0.1 + scroll * 0.1, 0);
    _currentLookAt.lerp(_targetLookAt, dampFactor);
    camera.lookAt(_currentLookAt);
  });

  const pylonAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];

  return (
    <>
      <color attach="background" args={['#020617']} />
      <hemisphereLight args={['#94A3B8', '#020617', 0.62]} />
      <directionalLight
        ref={keyLightRef}
        position={[6.5, 5.8, 4.5]}
        intensity={2.35}
        color="#FBBF24"
      />
      <directionalLight position={[-6, -3, -4]} intensity={1.05} color="#FB7185" />
      <pointLight
        ref={cursorLightRef}
        position={[0, 1, 3.8]}
        intensity={2.2}
        distance={14}
        color="#F59E0B"
      />

      {/* Composite 7-Part Procedural Atmospheric Telemetry Array */}
      <group ref={arrayGroupRef} position={[1.95, 0.18, 0]}>
        {/* Part 1: Translucent outer displaced shell */}
        <mesh ref={outerSphereRef} material={outerSphereMaterial}>
          <icosahedronGeometry args={[1.75, 4]} />
        </mesh>

        {/* Part 2: Glowing inner atmospheric plasma/aerosol core */}
        <mesh ref={innerCoreRef}>
          <icosahedronGeometry args={[0.95, 3]} />
          <meshStandardMaterial
            color="#0F172A"
            emissive="#F59E0B"
            emissiveIntensity={0.95}
            roughness={0.38}
            metalness={0.28}
          />
        </mesh>

        {/* Part 3: Machined LatheGeometry equatorial telemetry gimbal ring */}
        <mesh ref={gimbalRingRef} geometry={gimbalGeometry}>
          <meshStandardMaterial color="#334155" metalness={0.86} roughness={0.24} />
        </mesh>

        {/* Part 4: Tilted polar calibration ring */}
        <mesh ref={polarRingRef} rotation={[1.08, 0.42, 0]}>
          <torusGeometry args={[2.72, 0.022, 16, 120]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.78} roughness={0.28} />
        </mesh>

        {/* Part 5: Four radial sensor pylons with glowing cone emitters */}
        <group ref={sensorRigRef}>
          {pylonAngles.map((ang, idx) => (
            <group
              key={idx}
              position={[Math.cos(ang) * 2.38, 0, Math.sin(ang) * 2.38]}
              rotation={[0, -ang, 0]}
            >
              <mesh position={[0, 0.18, 0]}>
                <cylinderGeometry args={[0.045, 0.065, 0.48, 12]} />
                <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.35} />
              </mesh>
              <mesh position={[0, 0.48, 0]}>
                <coneGeometry args={[0.065, 0.16, 12]} />
                <meshStandardMaterial
                  color="#FBBF24"
                  emissive="#FB7185"
                  emissiveIntensity={0.85}
                  roughness={0.25}
                />
              </mesh>
            </group>
          ))}
        </group>

        {/* Part 6: Ground-anchored LatheGeometry telemetry pedestal & soft contact shadow */}
        <mesh geometry={pedestalGeometry} position={[0, -2.55, 0]}>
          <meshStandardMaterial color="#1E293B" metalness={0.68} roughness={0.44} />
        </mesh>
        <mesh position={[0, -2.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.4, 5.4]} />
          <meshBasicMaterial map={shadowTexture} transparent opacity={0.85} depthWrite={false} />
        </mesh>

        {/* Part 7: Volumetric amber/coral light shafts */}
        <mesh position={[1.3, 2.7, -1.4]} rotation={[0.16, 0, 0.38]}>
          <coneGeometry args={[2.6, 8.0, 32, 1, true]} />
          <meshBasicMaterial
            color="#F59E0B"
            transparent
            opacity={0.042}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Atmospheric Inversion Rings */}
      <group ref={inversionLayerRef} position={[0, -1.25, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.5, 6.8, 72]} />
          <meshBasicMaterial
            color="#FB7185"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.7, 5.4, 64]} />
          <meshBasicMaterial
            color="#F59E0B"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Procedural Urban Sensor Basin */}
      <group ref={skylineGroupRef} position={[0, -2.55, 0]}>
        <instancedMesh ref={towerMeshRef} args={[undefined, undefined, TOWER_COUNT]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#0F172A"
            roughness={0.48}
            roughnessMap={gridTexture}
            metalness={0.42}
            transparent
            opacity={0.82}
          />
        </instancedMesh>
        <instancedMesh ref={towerEmissiveRef} args={[undefined, undefined, TOWER_COUNT]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#FB7185" transparent opacity={0.78} />
        </instancedMesh>
      </group>

      {/* 2,200 Cursor-Reactive Particulate Motes */}
      <points geometry={particleGeometry} material={particleMaterial} />
    </>
  );
}

export function AtmosphereScene({
  scrollProgressRef,
  aqiRef,
  aiStreamingRef,
  pointerRef,
}: AtmosphereSceneProps) {
  const [webglFailed, setWebglFailed] = useState(false);
  const [isSoftwareGl, setIsSoftwareGl] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (webglFailed) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_68%_32%,rgba(245,158,11,0.16),rgba(251,113,133,0.1)_38%,#020617_80%)]"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(245,158,11,0.12),transparent_46%),radial-gradient(circle_at_24%_74%,rgba(251,113,133,0.08),transparent_52%)]" />

      <Canvas
        dpr={isSoftwareGl ? 1 : [1, 2]}
        camera={{ position: [0, 0.4, 8.6], fov: 44, near: 0.1, far: 60 }}
        gl={{
          antialias: !isSoftwareGl,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;

          const sw = detectSoftwareRenderer(gl);
          if (sw) setIsSoftwareGl(true);

          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setWebglFailed(true);
          });
          canvas.addEventListener('webglcontextrestored', () => {
            setWebglFailed(false);
          });
        }}
      >
        <AtmosphereRig
          scrollProgressRef={scrollProgressRef}
          aqiRef={aqiRef}
          aiStreamingRef={aiStreamingRef}
          pointerRef={pointerRef}
          isSoftwareGl={isSoftwareGl}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  );
}
