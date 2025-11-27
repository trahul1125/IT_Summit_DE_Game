class AIHunterGame {
    constructor() {
        this.user = { name: '', organization: '' };
        this.aiModels = [
            { name: 'GPT-4', icon: '🤖', caught: false, rarity: 'legendary' },
            { name: 'Claude', icon: '🧠', caught: false, rarity: 'legendary' },
            { name: 'Gemini', icon: '💎', caught: false, rarity: 'epic' },
            { name: 'LLaMA', icon: '🦙', caught: false, rarity: 'epic' },
            { name: 'PaLM', icon: '🌴', caught: false, rarity: 'rare' },
            { name: 'BERT', icon: '📚', caught: false, rarity: 'common' },
            { name: 'T5', icon: '🔄', caught: false, rarity: 'common' },
            { name: 'GPT-3', icon: '⚡', caught: false, rarity: 'rare' },
            { name: 'Mistral', icon: '🌪️', caught: false, rarity: 'epic' },
            { name: 'Falcon', icon: '🦅', caught: false, rarity: 'rare' }
        ];
        
        this.currentAI = null;
        this.cameraStream = null;
        this.canvas = null;
        this.ctx = null;
        
        this.heading = 0;
        this.pitch = 0;
        
        this.aiAngle = 0;
        this.aiPitch = 0;
        this.aiDistance = 0;
        
        this.aiVisible = false;
        this.aiInFrame = false;
        
        this.frameCenter = { x: 0, y: 0 };
        this.frameRadius = 100;
        
        this.spawnTimer = null;
        this.animationId = null;
        
        this.initialBeta = null;
        this.initialGamma = null;
        this.motionSupported = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateInventory();
        this.updateProgress();
    }

    setupEventListeners() {
        document.getElementById('user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startGame();
        });

        document.getElementById('capture-btn').addEventListener('click', () => {
            this.captureAI();
        });

        document.getElementById('inventory-btn').addEventListener('click', () => {
            this.showInventory();
        });

        document.getElementById('back-to-game').addEventListener('click', () => {
            this.showGame();
        });

        document.getElementById('continue-btn').addEventListener('click', () => {
            this.hideModal('success-modal');
            this.scheduleNextSpawn();
        });

        document.getElementById('view-collection-btn').addEventListener('click', () => {
            this.hideModal('complete-modal');
            this.showInventory();
        });
    }

    async startGame() {
        this.user.name = document.getElementById('name').value;
        this.user.organization = document.getElementById('organization').value;

        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            const video = document.getElementById('camera-feed');
            video.srcObject = this.cameraStream;
            
            await new Promise(resolve => {
                video.onloadedmetadata = resolve;
            });
            
            this.canvas = document.getElementById('ar-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
            
            window.addEventListener('resize', () => this.resizeCanvas());
            
            this.frameCenter = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2
            };

            this.showPage('game-page');
            this.setupMotionTracking();
            this.startGameLoop();
            this.scheduleNextSpawn();
            
        } catch (error) {
            alert('Camera access is required to play. Please allow camera permissions and try again.');
            console.error('Camera error:', error);
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.frameCenter = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };
    }

    setupMotionTracking() {
        if (window.DeviceOrientationEvent) {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            this.enableMotion();
                        } else {
                            this.fallbackToTouch();
                        }
                    })
                    .catch(() => this.fallbackToTouch());
            } else {
                this.enableMotion();
            }
        } else {
            this.fallbackToTouch();
        }
    }

    enableMotion() {
        let initialAlpha = null;
        let initialBeta = null;
        
        window.addEventListener('deviceorientation', (e) => {
            if (e.alpha !== null && e.beta !== null) {
                this.motionSupported = true;
                
                if (initialAlpha === null) {
                    initialAlpha = e.alpha;
                    initialBeta = e.beta;
                }
                
                let alphaOffset = e.alpha - initialAlpha;
                if (alphaOffset > 180) alphaOffset -= 360;
                if (alphaOffset < -180) alphaOffset += 360;
                
                this.heading = -alphaOffset;
                
                let betaOffset = e.beta - initialBeta;
                this.pitch = betaOffset * 0.8;
                
                this.heading = Math.max(-180, Math.min(180, this.heading));
                this.pitch = Math.max(-60, Math.min(60, this.pitch));
            }
        });
    }

    fallbackToTouch() {
        let lastTouchX = null;
        let lastTouchY = null;
        let isDragging = false;
        
        this.canvas.style.pointerEvents = 'auto';
        
        const handleStart = (clientX, clientY) => {
            isDragging = true;
            lastTouchX = clientX;
            lastTouchY = clientY;
        };
        
        const handleMove = (clientX, clientY) => {
            if (!isDragging) return;
            
            const deltaX = clientX - lastTouchX;
            const deltaY = clientY - lastTouchY;
            
            this.heading += deltaX * 0.5;
            this.pitch -= deltaY * 0.3;
            
            this.heading = ((this.heading % 360) + 360) % 360;
            if (this.heading > 180) this.heading -= 360;
            this.pitch = Math.max(-60, Math.min(60, this.pitch));
            
            lastTouchX = clientX;
            lastTouchY = clientY;
        };
        
        const handleEnd = () => {
            isDragging = false;
        };

        this.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchend', handleEnd);

        this.canvas.addEventListener('mousedown', (e) => {
            handleStart(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('mouseup', handleEnd);
        this.canvas.addEventListener('mouseleave', handleEnd);
    }

    startGameLoop() {
        const loop = () => {
            this.update();
            this.render();
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    update() {
        if (this.currentAI) {
            let angleDiff = this.aiAngle - this.heading;
            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;
            
            const pitchDiff = this.aiPitch - this.pitch;
            
            const fovH = 70;
            const fovV = 50;
            
            this.aiVisible = Math.abs(angleDiff) < fovH && Math.abs(pitchDiff) < fovV;
            
            if (this.aiVisible) {
                const screenX = this.frameCenter.x + (angleDiff / fovH) * this.canvas.width * 0.5;
                const screenY = this.frameCenter.y - (pitchDiff / fovV) * this.canvas.height * 0.5;
                
                this.aiScreenPos = { x: screenX, y: screenY };
                
                const dx = screenX - this.frameCenter.x;
                const dy = screenY - this.frameCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.aiInFrame = distance < this.frameRadius;
            } else {
                this.aiInFrame = false;
            }
            
            this.updateRadar(angleDiff);
            this.updateCaptureButton();
            this.updateTargetIndicator();
        }
    }

    updateRadar(angleDiff) {
        const radarDot = document.getElementById('radar-dot');
        const radarSize = 80;
        const radarCenter = radarSize / 2;
        
        if (this.currentAI) {
            const angleRad = (angleDiff * Math.PI) / 180;
            const distance = Math.min(radarSize * 0.35, radarSize * 0.35);
            
            const dotX = radarCenter + Math.sin(angleRad) * distance;
            const dotY = radarCenter - Math.cos(angleRad) * distance;
            
            radarDot.style.left = dotX + 'px';
            radarDot.style.top = dotY + 'px';
            radarDot.classList.add('active');
        } else {
            radarDot.classList.remove('active');
        }
    }

    updateCaptureButton() {
        const btn = document.getElementById('capture-btn');
        const label = document.getElementById('capture-label');
        const frame = document.getElementById('targeting-frame');
        
        if (this.aiInFrame && this.aiVisible) {
            btn.disabled = false;
            label.textContent = 'CAPTURE';
            label.classList.add('ready');
            frame.classList.add('locked');
        } else {
            btn.disabled = true;
            if (this.currentAI) {
                label.textContent = this.aiVisible ? 'AIM AT TARGET' : 'FIND TARGET';
            } else {
                label.textContent = 'NO TARGET';
            }
            label.classList.remove('ready');
            frame.classList.remove('locked');
        }
    }

    updateTargetIndicator() {
        const indicator = document.getElementById('target-indicator');
        const scanIndicator = document.getElementById('scan-indicator');
        
        if (this.currentAI) {
            indicator.classList.remove('hidden');
            document.getElementById('target-name').textContent = this.currentAI.name;
            scanIndicator.classList.add('hidden');
        } else {
            indicator.classList.add('hidden');
            scanIndicator.classList.remove('hidden');
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.currentAI && this.aiVisible && this.aiScreenPos) {
            this.drawAI(this.aiScreenPos.x, this.aiScreenPos.y);
        }
        
        if (this.currentAI && !this.aiVisible) {
            this.drawDirectionIndicator();
        }
    }

    drawDirectionIndicator() {
        let angleDiff = this.aiAngle - this.heading;
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;
        
        const arrowAngle = (angleDiff * Math.PI) / 180;
        const radius = Math.min(this.canvas.width, this.canvas.height) * 0.35;
        
        const arrowX = this.frameCenter.x + Math.sin(arrowAngle) * radius;
        const arrowY = this.frameCenter.y - Math.cos(arrowAngle) * radius * 0.5;
        
        this.ctx.save();
        this.ctx.translate(arrowX, arrowY);
        this.ctx.rotate(arrowAngle);
        
        this.ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
        this.ctx.shadowColor = '#00f0ff';
        this.ctx.shadowBlur = 15;
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, -20);
        this.ctx.lineTo(-12, 10);
        this.ctx.lineTo(0, 5);
        this.ctx.lineTo(12, 10);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawAI(x, y) {
        const time = Date.now() / 1000;
        const floatY = y + Math.sin(time * 2) * 10;
        const scale = 1 + Math.sin(time * 3) * 0.05;
        
        const size = 80 * scale;
        
        this.ctx.save();
        
        const gradient = this.ctx.createRadialGradient(x, floatY, 0, x, floatY, size * 1.5);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
        gradient.addColorStop(0.5, 'rgba(124, 58, 237, 0.2)');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, floatY, size * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        const innerGlow = this.ctx.createRadialGradient(x, floatY, size * 0.3, x, floatY, size);
        innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        innerGlow.addColorStop(0.7, 'rgba(255, 255, 255, 0.85)');
        innerGlow.addColorStop(1, 'rgba(200, 200, 255, 0.7)');
        
        this.ctx.fillStyle = innerGlow;
        this.ctx.shadowColor = this.aiInFrame ? '#10b981' : '#00f0ff';
        this.ctx.shadowBlur = this.aiInFrame ? 50 : 30;
        this.ctx.beginPath();
        this.ctx.arc(x, floatY, size * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
        this.ctx.font = `${size * 0.7}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.currentAI.icon, x, floatY);
        
        this.ctx.font = 'bold 14px Orbitron, sans-serif';
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.lineWidth = 4;
        this.ctx.strokeText(this.currentAI.name, x, floatY + size + 15);
        this.ctx.fillText(this.currentAI.name, x, floatY + size + 15);
        
        if (this.aiInFrame) {
            this.ctx.strokeStyle = '#10b981';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(x, floatY, size + 10, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        this.ctx.restore();
    }

    scheduleNextSpawn() {
        if (this.spawnTimer) clearTimeout(this.spawnTimer);
        
        const uncaught = this.aiModels.filter(ai => !ai.caught);
        if (uncaught.length === 0) {
            this.gameComplete();
            return;
        }
        
        const delay = 1500 + Math.random() * 2000;
        
        this.spawnTimer = setTimeout(() => {
            this.spawnAI();
        }, delay);
    }

    spawnAI() {
        const uncaught = this.aiModels.filter(ai => !ai.caught);
        if (uncaught.length === 0) return;
        
        this.currentAI = uncaught[Math.floor(Math.random() * uncaught.length)];
        
        const spawnRange = 60;
        const offsetAngle = (Math.random() - 0.5) * spawnRange * 2;
        this.aiAngle = this.heading + offsetAngle;
        
        while (this.aiAngle > 180) this.aiAngle -= 360;
        while (this.aiAngle < -180) this.aiAngle += 360;
        
        this.aiPitch = this.pitch + (Math.random() - 0.5) * 30;
        this.aiPitch = Math.max(-40, Math.min(40, this.aiPitch));
        
        this.updateTargetIndicator();
    }

    captureAI() {
        if (!this.aiInFrame || !this.currentAI) return;
        
        const captured = this.currentAI;
        captured.caught = true;
        
        document.getElementById('captured-icon').textContent = captured.icon;
        document.getElementById('capture-message').textContent = 
            `${captured.name} has been added to your collection!`;
        
        this.currentAI = null;
        this.aiScreenPos = null;
        
        this.updateProgress();
        this.updateInventory();
        this.showModal('success-modal');
    }

    gameComplete() {
        document.getElementById('complete-message').textContent = 
            `Congratulations ${this.user.name}! You've captured all 10 AI models!`;
        this.showModal('complete-modal');
    }

    updateProgress() {
        const caught = this.aiModels.filter(ai => ai.caught).length;
        const total = this.aiModels.length;
        const percent = (caught / total) * 100;
        
        document.getElementById('caught-count').textContent = caught;
        document.getElementById('total-count').textContent = total;
        document.getElementById('progress-fill').style.width = percent + '%';
        
        document.getElementById('inv-caught').textContent = caught;
        document.getElementById('inv-total').textContent = total;
    }

    updateInventory() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';

        this.aiModels.forEach(ai => {
            const item = document.createElement('div');
            item.className = `inventory-item ${ai.caught ? 'caught' : ''}`;
            item.innerHTML = `
                <div class="icon">${ai.icon}</div>
                <div class="name">${ai.caught ? ai.name : '???'}</div>
            `;
            grid.appendChild(item);
        });
    }

    showModal(id) {
        document.getElementById(id).classList.add('active');
    }

    hideModal(id) {
        document.getElementById(id).classList.remove('active');
    }

    showInventory() {
        this.updateInventory();
        this.showPage('inventory-page');
    }

    showGame() {
        this.showPage('game-page');
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AIHunterGame();
});
