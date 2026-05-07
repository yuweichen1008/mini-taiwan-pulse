import * as THREE from "three";
import type { Ship, VesselCategory } from "../types";
import { getVesselCategory, VESSEL_COLORS, VESSEL_COLORS_LIGHT } from "../types";
import { toMercator } from "../utils/coordinates";
import { interpolatePosition, getTrailUpToTime } from "../utils/interpolation";

const TRAIL_DURATION = 1800; // 30 minutes of trail
const MAX_TRAIL_VERTICES = 150000;

// Pre-parsed THREE.Color cache per category to avoid allocation in hot loop
const _catColorsDark: Record<VesselCategory, THREE.Color> = {} as never;
const _catColorsLight: Record<VesselCategory, THREE.Color> = {} as never;
for (const [cat, hex] of Object.entries(VESSEL_COLORS)) {
  _catColorsDark[cat as VesselCategory] = new THREE.Color(hex);
}
for (const [cat, hex] of Object.entries(VESSEL_COLORS_LIGHT)) {
  _catColorsLight[cat as VesselCategory] = new THREE.Color(hex);
}

/**
 * ShipScene — InstancedMesh (per-category color) + LineSegments trail.
 * Vessels are colored and optionally filtered by VesselCategory.
 */
export class ShipScene {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer!: THREE.WebGLRenderer;

  private instancedMesh: THREE.InstancedMesh | null = null;
  private maxInstances = 12000;
  private isDarkTheme = true;
  private orbScale = 0.000005;
  private breathPhase = 0;

  private trailGeo: THREE.BufferGeometry | null = null;
  private trailLine: THREE.LineSegments | null = null;
  private trailPositions!: Float32Array;
  private trailColors!: Float32Array;

  private viewBounds: { minLng: number; maxLng: number; minLat: number; maxLat: number } | null = null;
  private _dummy = new THREE.Matrix4();
  private _color = new THREE.Color();

  // Which categories are currently shown — all on by default
  private visibleCategories: Set<VesselCategory> = new Set([
    "military", "coastguard", "cargo", "tanker", "passenger", "fishing", "tug", "other",
  ]);

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
  }

  init(gl: WebGLRenderingContext) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: gl.canvas as HTMLCanvasElement,
      context: gl as unknown as WebGL2RenderingContext,
      antialias: true,
    });
    this.renderer.autoClear = false;

    const geo = new THREE.IcosahedronGeometry(1, 2);

    // Per-instance color via instanceColor buffer
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.maxInstances);
    this.instancedMesh.frustumCulled = false;
    this.instancedMesh.count = 0;
    this.scene.add(this.instancedMesh);

    this.trailGeo = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(MAX_TRAIL_VERTICES * 3);
    this.trailColors = new Float32Array(MAX_TRAIL_VERTICES * 3);
    this.trailGeo.setAttribute("position", new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeo.setAttribute("color", new THREE.BufferAttribute(this.trailColors, 3));
    this.trailGeo.setDrawRange(0, 0);

    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trailLine = new THREE.LineSegments(this.trailGeo, trailMat);
    this.trailLine.frustumCulled = false;
    this.scene.add(this.trailLine);
  }

  setTheme(isDark: boolean) {
    this.isDarkTheme = isDark;
    if (this.instancedMesh) {
      const mat = this.instancedMesh.material as THREE.MeshBasicMaterial;
      mat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
      mat.opacity = isDark ? 0.85 : 0.75;
    }
    if (this.trailLine) {
      const mat = this.trailLine.material as THREE.LineBasicMaterial;
      mat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
      mat.opacity = isDark ? 0.7 : 0.45;
    }
  }

  setVisibleCategories(cats: Set<VesselCategory>) {
    this.visibleCategories = cats;
  }

  setOrbScale(scale: number) {
    this.orbScale = scale;
  }

  setViewBounds(bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number } | null) {
    this.viewBounds = bounds;
  }

  update(ships: Ship[], currentTime: number) {
    if (!this.instancedMesh || !this.trailGeo) return;

    this.breathPhase += 0.02;
    const breathFactor = 1.0 + 0.12 * Math.sin(this.breathPhase);

    const dummy = this._dummy;
    const color = this._color;
    let headCount = 0;
    let vi = 0;
    const bounds = this.viewBounds;
    const baseScale = this.orbScale * 0.6;
    const catColors = this.isDarkTheme ? _catColorsDark : _catColorsLight;
    const positions = this.trailPositions;
    const trailColors = this.trailColors;

    for (const ship of ships) {
      if (headCount >= this.maxInstances) break;

      const cat = getVesselCategory(ship.vessel_type);
      if (!this.visibleCategories.has(cat)) continue;

      const path = ship.path;
      if (path.length === 0) continue;
      if (currentTime < path[0]![3] || currentTime > path[path.length - 1]![3]) continue;

      const pos = interpolatePosition(path, currentTime);
      if (!pos) continue;

      const [lat, lng] = pos;

      if (bounds) {
        const pad = 0.5;
        if (lng < bounds.minLng - pad || lng > bounds.maxLng + pad ||
            lat < bounds.minLat - pad || lat > bounds.maxLat + pad) continue;
      }

      const mc = toMercator(lat, lng, 0);
      const s = baseScale * breathFactor;
      dummy.makeScale(s, s, s);
      dummy.setPosition(mc.x, mc.y, mc.z);
      this.instancedMesh.setMatrixAt(headCount, dummy);

      color.copy(catColors[cat]);
      this.instancedMesh.setColorAt(headCount, color);
      headCount++;

      // Trail colored by category, fading toward tail
      const catColor = catColors[cat]!;
      const trail = getTrailUpToTime(ship.path, currentTime, TRAIL_DURATION);
      if (trail.length >= 2 && vi < MAX_TRAIL_VERTICES - trail.length * 2) {
        for (let i = 0; i < trail.length - 1; i++) {
          const ptA = trail[i]!;
          const ptB = trail[i + 1]!;
          const progA = i / (trail.length - 1);
          const progB = (i + 1) / (trail.length - 1);

          const mcA = toMercator(ptA[0], ptA[1], 0);
          const mcB = toMercator(ptB[0], ptB[1], 0);

          positions[vi * 3] = mcA.x; positions[vi * 3 + 1] = mcA.y; positions[vi * 3 + 2] = mcA.z;
          const bA = 0.08 + 0.92 * progA;
          trailColors[vi * 3] = catColor.r * bA; trailColors[vi * 3 + 1] = catColor.g * bA; trailColors[vi * 3 + 2] = catColor.b * bA;
          vi++;

          positions[vi * 3] = mcB.x; positions[vi * 3 + 1] = mcB.y; positions[vi * 3 + 2] = mcB.z;
          const bB = 0.08 + 0.92 * progB;
          trailColors[vi * 3] = catColor.r * bB; trailColors[vi * 3 + 1] = catColor.g * bB; trailColors[vi * 3 + 2] = catColor.b * bB;
          vi++;
        }
      }
    }

    this.instancedMesh.count = headCount;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    this.trailGeo.setDrawRange(0, vi);
    (this.trailGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.trailGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  render(matrix: number[]) {
    const gl = this.renderer.getContext();
    const blendEnabled = gl.isEnabled(gl.BLEND);
    const blendSrc = gl.getParameter(gl.BLEND_SRC_RGB) as number;
    const blendDst = gl.getParameter(gl.BLEND_DST_RGB) as number;
    const blendSrcA = gl.getParameter(gl.BLEND_SRC_ALPHA) as number;
    const blendDstA = gl.getParameter(gl.BLEND_DST_ALPHA) as number;

    this.camera.projectionMatrix.fromArray(matrix);
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.renderer.resetState();

    if (blendEnabled) gl.enable(gl.BLEND);
    else gl.disable(gl.BLEND);
    gl.blendFuncSeparate(blendSrc, blendDst, blendSrcA, blendDstA);
  }

  getVisibleCount(): number {
    return this.instancedMesh?.count ?? 0;
  }

  dispose() {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as THREE.Material).dispose();
      this.instancedMesh = null;
    }
    if (this.trailLine) {
      this.scene.remove(this.trailLine);
      this.trailGeo?.dispose();
      (this.trailLine.material as THREE.Material).dispose();
      this.trailLine = null;
      this.trailGeo = null;
    }
    this.renderer?.dispose();
  }
}
