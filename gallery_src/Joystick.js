class JoyStick {
  constructor(options) {
    this.canvas = options.canvas;
    this.context = this.canvas.getContext("2d");
    this.movedX = this.canvas.width / 2;
    this.movedY = this.canvas.height / 2;
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.margin = 15; // Margin to prevent stick from being hidden at edges
    this.maxMoveStick = (Math.min(this.canvas.width, this.canvas.height) / 2) - this.margin;
    this.directionChangeCallback = null;

    // Bind event listeners
    this.canvas.addEventListener("mousedown", this.start.bind(this));
    this.canvas.addEventListener("touchstart", this.start.bind(this));
    window.addEventListener("mouseup", this.end.bind(this));  // Global listener
    window.addEventListener("touchend", this.end.bind(this));  // Global listener
    this.canvas.addEventListener("mousemove", this.move.bind(this));
    this.canvas.addEventListener("touchmove", this.move.bind(this));

    this.active = false;
    this.drawJoystick();
  }

  start(event) {
    this.active = true;
    this.move(event);
  }

  end(event) {
    this.active = false;
    this.movedX = this.centerX;
    this.movedY = this.centerY;
    this.emitDirectionChange(); // Emit the center position when released
    this.drawJoystick();  // Reset the joystick to the center
  }

  move(event) {
    if (!this.active) return;

    const rect = this.canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    // Calculate relative position inside canvas
    this.movedX = clientX - rect.left;
    this.movedY = clientY - rect.top;

    // Clamp the stick movement to stay within the circular bounds
    const deltaX = this.movedX - this.centerX;
    const deltaY = this.movedY - this.centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Limit the movement of the joystick to respect the margin
    if (distance > this.maxMoveStick) {
      const angle = Math.atan2(deltaY, deltaX);
      this.movedX = this.centerX + this.maxMoveStick * Math.cos(angle);
      this.movedY = this.centerY + this.maxMoveStick * Math.sin(angle);
    }

    this.emitDirectionChange();
    this.drawJoystick();
  }

  drawJoystick() {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Outer circle (joystick range)
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.maxMoveStick, 0, Math.PI * 2);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner circle (joystick knob)
    ctx.beginPath();
    ctx.arc(this.movedX, this.movedY, 15, 0, Math.PI * 2);
    ctx.fillStyle = "#007BFF";
    ctx.fill();
  }

  emitDirectionChange() {
    const deltaX = this.movedX - this.centerX;
    const deltaY = this.movedY - this.centerY;
    const direction = this.getCardinalDirection(deltaX, deltaY);

    if (this.directionChangeCallback) {
      this.directionChangeCallback({ direction });
    }
  }

  onDirectionChange(callback) {
    this.directionChangeCallback = callback;
  }

  getCardinalDirection(deltaX, deltaY) {
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return "center";

    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    if (angle >= 45 && angle < 135) {
      return "down";
    } else if (angle >= -135 && angle < -45) {
      return "up";
    } else if (angle >= -45 && angle < 45) {
      return "right";
    } else {
      return "left";
    }
  }
}

export default JoyStick;
