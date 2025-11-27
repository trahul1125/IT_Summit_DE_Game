class AIHunterGame {
    constructor() {
        this.user = { name: '', organization: '' };
        this.aiModels = [
            { name: 'GPT-4', icon: '🤖', caught: false },
            { name: 'Claude', icon: '🧠', caught: false },
            { name: 'Gemini', icon: '💎', caught: false },
            { name: 'LLaMA', icon: '🦙', caught: false },
            { name: 'PaLM', icon: '🌴', caught: false },
            { name: 'BERT', icon: '📚', caught: false },
            { name: 'T5', icon: '🔄', caught: false },
            { name: 'GPT-3', icon: '⚡', caught: false },
            { name: 'Mistral', icon: '🌪️', caught: false },
            { name: 'Falcon', icon: '🦅', caught: false }
        ];
        this.currentTarget = null;
        this.activeIcons = [];
        this.cameraStream = null;
        this.canvas = null;
        this.ctx = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateInventory();
    }

    setupEventListeners() {
        // Landing page form
        document.getElementById('user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startGame();
        });

        // Game controls
        document.getElementById('capture-btn').addEventListener('click', () => {
            this.captureTarget();
        });

        document.getElementById('inventory-btn').addEventListener('click', () => {
            this.showInventory();
        });

        document.getElementById('back-to-game').addEventListener('click', () => {
            this.showGame();
        });

        document.getElementById('continue-btn').addEventListener('click', () => {
            this.hideModal();
        });
    }

    async startGame() {
        // Get user info
        this.user.name = document.getElementById('name').value;
        this.user.organization = document.getElementById('organization').value;

        // Request camera permission
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            const video = document.getElementById('camera-feed');
            video.srcObject = this.cameraStream;
            
            // Setup canvas for AR overlay
            this.canvas = document.getElementById('ar-canvas');
            this.ctx = this.canvas.getContext('2d');
            
            // Resize canvas to match video
            video.addEventListener('loadedmetadata', () => {
                this.canvas.width = video.videoWidth;
                this.canvas.height = video.videoHeight;
            });

            this.showPage('game-page');
            this.startARSession();
            
        } catch (error) {
            alert('Camera access is required to play the game!');
            console.error('Camera error:', error);
        }
    }

    startARSession() {
        this.spawnRandomAI();
        this.gameLoop();
    }

    spawnRandomAI() {
        // Clear existing icons
        this.activeIcons = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Find uncaught AI models
        const uncaughtModels = this.aiModels.filter(ai => !ai.caught);
        if (uncaughtModels.length === 0) {
            this.gameComplete();
            return;
        }

        // Spawn 1-3 random AI icons
        const spawnCount = Math.min(Math.random() * 3 + 1, uncaughtModels.length);
        
        for (let i = 0; i < spawnCount; i++) {
            const randomAI = uncaughtModels[Math.floor(Math.random() * uncaughtModels.length)];
            const icon = {
                ai: randomAI,
                x: Math.random() * (this.canvas.width - 100) + 50,
                y: Math.random() * (this.canvas.height - 100) + 50,
                size: 60,
                pulse: 0
            };
            this.activeIcons.push(icon);
        }

        // Set current target
        this.currentTarget = this.activeIcons[0]?.ai;
        this.updateUI();
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw AI icons
        this.activeIcons.forEach(icon => {
            this.drawAIIcon(icon);
            icon.pulse += 0.1;
        });

        // Continue game loop
        if (this.activeIcons.length > 0) {
            requestAnimationFrame(() => this.gameLoop());
        } else {
            // Spawn new AIs after 2 seconds
            setTimeout(() => this.spawnRandomAI(), 2000);
        }
    }

    drawAIIcon(icon) {
        const { x, y, size, ai, pulse } = icon;
        
        // Pulsing effect
        const currentSize = size + Math.sin(pulse) * 5;
        
        // Draw glow effect
        this.ctx.shadowColor = ai === this.currentTarget ? '#ff6b6b' : '#4CAF50';
        this.ctx.shadowBlur = 20;
        
        // Draw icon background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw icon emoji
        this.ctx.shadowBlur = 0;
        this.ctx.font = `${currentSize * 0.6}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#333';
        this.ctx.fillText(ai.icon, x, y);
        
        // Draw name
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(ai.name, x, y + currentSize / 2 + 15);
        this.ctx.fillText(ai.name, x, y + currentSize / 2 + 15);
    }

    captureTarget() {
        if (!this.currentTarget) return;

        // Find and remove the target icon
        const targetIndex = this.activeIcons.findIndex(icon => icon.ai === this.currentTarget);
        if (targetIndex === -1) return;

        // Mark as caught
        this.currentTarget.caught = true;
        this.activeIcons.splice(targetIndex, 1);

        // Show success message
        this.showCaptureSuccess(this.currentTarget);

        // Update target
        this.currentTarget = this.activeIcons[0]?.ai || null;
        this.updateUI();
        this.updateInventory();
    }

    showCaptureSuccess(ai) {
        document.getElementById('capture-message').textContent = 
            `You caught ${ai.name} ${ai.icon}!`;
        document.getElementById('success-modal').classList.add('active');
    }

    hideModal() {
        document.getElementById('success-modal').classList.remove('active');
    }

    updateUI() {
        const caughtCount = this.aiModels.filter(ai => ai.caught).length;
        document.getElementById('caught-count').textContent = caughtCount;
        document.getElementById('total-count').textContent = this.aiModels.length;
        
        if (this.currentTarget) {
            document.getElementById('target-name').textContent = this.currentTarget.name;
        } else {
            document.getElementById('target-name').textContent = 'None nearby';
        }
    }

    updateInventory() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';

        this.aiModels.forEach(ai => {
            const item = document.createElement('div');
            item.className = `inventory-item ${ai.caught ? 'caught' : ''}`;
            item.innerHTML = `
                <div class="icon">${ai.caught ? ai.icon : '❓'}</div>
                <div class="name">${ai.caught ? ai.name : '???'}</div>
            `;
            grid.appendChild(item);
        });
    }

    showInventory() {
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

    gameComplete() {
        alert(`🎉 Congratulations ${this.user.name}! You've caught all AI models!`);
        this.showInventory();
    }
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AIHunterGame();
});