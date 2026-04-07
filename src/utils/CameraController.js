import * as THREE from 'three';

export class CameraController {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.isRotating = false;
    this.isPanning = false;
    this.isZooming = false;

    // 相机参数
    this.radius = 15; // 初始距离
    this.theta = 45; // 水平角度
    this.phi = 60; // 垂直角度
    this.target = new THREE.Vector3(0, 0, 0);

    // 鼠标/触摸位置
    this.mouseX = 0;
    this.mouseY = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // 缩放参数
    this.minRadius = 5;
    this.maxRadius = 30;
    this.zoomSpeed = 0.1;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateCameraPosition();
  }

  setupEventListeners() {
    // 鼠标事件
    this.canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
    this.canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
    this.canvas.addEventListener('mouseup', (event) => this.onMouseUp(event));
    this.canvas.addEventListener('wheel', (event) => this.onWheel(event));

    // 触摸事件
    this.canvas.addEventListener('touchstart', (event) => this.onTouchStart(event));
    this.canvas.addEventListener('touchmove', (event) => this.onTouchMove(event));
    this.canvas.addEventListener('touchend', (event) => this.onTouchEnd(event));

    // 防止右键菜单
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  onMouseDown(event) {
    event.preventDefault();

    if (event.button === 0) { // 左键
      this.isRotating = true;
    } else if (event.button === 2) { // 右键
      this.isPanning = true;
    }

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  onMouseMove(event) {
    event.preventDefault();

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    if (this.isRotating) {
      this.rotate(deltaX, deltaY);
    } else if (this.isPanning) {
      this.pan(deltaX, deltaY);
    }

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  onMouseUp(event) {
    this.isRotating = false;
    this.isPanning = false;
  }

  onWheel(event) {
    event.preventDefault();

    const delta = event.deltaY > 0 ? 1 : -1;
    this.zoom(delta);
  }

  onTouchStart(event) {
    if (event.touches.length === 1) {
      this.isRotating = true;
      this.lastMouseX = event.touches[0].clientX;
      this.lastMouseY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      this.isZooming = true;
      this.lastPinchDistance = this.getPinchDistance(event.touches);
    }
  }

  onTouchMove(event) {
    event.preventDefault();

    if (event.touches.length === 1 && this.isRotating) {
      const deltaX = event.touches[0].clientX - this.lastMouseX;
      const deltaY = event.touches[0].clientY - this.lastMouseY;
      this.rotate(deltaX, deltaY);
      this.lastMouseX = event.touches[0].clientX;
      this.lastMouseY = event.touches[0].clientY;
    } else if (event.touches.length === 2 && this.isZooming) {
      const currentDistance = this.getPinchDistance(event.touches);
      const delta = currentDistance - this.lastPinchDistance;
      this.zoom(-delta * 0.01);
      this.lastPinchDistance = currentDistance;
    }
  }

  onTouchEnd(event) {
    this.isRotating = false;
    this.isZooming = false;
  }

  getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  rotate(deltaX, deltaY) {
    // 旋转速度
    const rotateSpeed = 0.5;

    // 更新角度
    this.theta -= deltaX * rotateSpeed;
    this.phi += deltaY * rotateSpeed;

    // 限制垂直角度
    this.phi = Math.max(10, Math.min(170, this.phi));
  }

  pan(deltaX, deltaY) {
    // 平移速度
    const panSpeed = 0.01;

    // 计算相机方向
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    // 计算右向量
    const right = new THREE.Vector3();
    right.crossVectors(direction, this.camera.up).normalize();

    // 计算上向量
    const up = new THREE.Vector3();
    up.crossVectors(right, direction).normalize();

    // 平移目标点
    this.target.addScaledVector(right, -deltaX * panSpeed * this.radius);
    this.target.addScaledVector(up, deltaY * panSpeed * this.radius);

    this.updateCameraPosition();
  }

  zoom(delta) {
    // 更新半径
    this.radius += delta * this.zoomSpeed;
    this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius));

    this.updateCameraPosition();
  }

  updateCameraPosition() {
    // 转换为弧度
    const thetaRad = THREE.MathUtils.degToRad(this.theta);
    const phiRad = THREE.MathUtils.degToRad(this.phi);

    // 计算相机位置
    const x = this.target.x + this.radius * Math.sin(phiRad) * Math.cos(thetaRad);
    const y = this.target.y + this.radius * Math.cos(phiRad);
    const z = this.target.z + this.radius * Math.sin(phiRad) * Math.sin(thetaRad);

    // 更新相机位置
    this.camera.position.set(x, y, z);

    // 让相机看向目标点
    this.camera.lookAt(this.target);
  }

  reset() {
    // 重置相机到初始位置
    this.radius = 15;
    this.theta = 45;
    this.phi = 60;
    this.target.set(0, 0, 0);
    this.updateCameraPosition();
  }

  constrainToBounds(bounds) {
    // 如果需要限制相机在某个范围内
    // 这里可以添加边界限制逻辑
  }

  update() {
    // 在动画循环中调用，用于持续更新相机状态
    this.updateCameraPosition();
  }
}