class App {
    constructor() {
        this.grid = new NDimensionalGrid(3, 5);
        this.renderer = new GridRenderer(document.getElementById('grid-canvas'));
        this.animationSpeed = 1.0;
        this.isPlaying = false;
        this.animationFrame = null;
        this.animationStartTime = 0;
        this.animationProgress = 0;
        
        this.setupControls();
        this.render();
    }
    
    setupControls() {
        const dimensionsSlider = document.getElementById('dimensions');
        const gridSizeSlider = document.getElementById('grid-size');
        const animationSpeedSlider = document.getElementById('animation-speed');
        
        dimensionsSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('dim-value').textContent = value;
            this.grid.resize(value, this.grid.size);
            this.render();
        });
        
        gridSizeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('size-value').textContent = value;
            this.grid.resize(this.grid.dimensions, value);
            this.render();
        });
        
        animationSpeedSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.animationSpeed = value;
            document.getElementById('speed-value').textContent = value.toFixed(1);
        });
        
        document.getElementById('step-btn').addEventListener('click', () => {
            this.step();
        });
        
        document.getElementById('play-btn').addEventListener('click', () => {
            this.play();
        });
        
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.pause();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.reset();
        });
        
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const shape = btn.dataset.shape;
                this.renderer.setSelectedShape(shape);
            });
        });
        
        window.addEventListener('resize', () => {
            this.renderer.setupCanvas();
            this.render();
        });
    }
    
    step() {
        this.animationStartTime = Date.now();
        this.animationProgress = 0;
        this.grid.step();
        this.animateStep();
    }
    
    animateStep() {
        const elapsed = (Date.now() - this.animationStartTime) / 1000;
        this.animationProgress = Math.min(elapsed / this.animationSpeed, 1);
        
        this.render();
        
        if (this.animationProgress < 1) {
            requestAnimationFrame(() => this.animateStep());
        }
    }
    
    play() {
        this.isPlaying = true;
        this.playLoop();
    }
    
    playLoop() {
        if (!this.isPlaying) return;
        
        this.step();
        
        setTimeout(() => {
            this.playLoop();
        }, this.animationSpeed * 1000);
    }
    
    pause() {
        this.isPlaying = false;
    }
    
    reset() {
        this.pause();
        this.grid.initialize();
        this.animationProgress = 1;
        this.render();
    }
    
    render() {
        this.renderer.render(this.grid, this.animationProgress);
        this.updateStats();
        this.updateDimensionInfo();
    }
    
    updateStats() {
        document.getElementById('step-count').textContent = this.grid.stepCount;
        document.getElementById('active-cells').textContent = this.grid.getActiveCellCount();
    }
    
    updateDimensionInfo() {
        const dimInfo = document.getElementById('dim-info');
        const dims = this.grid.dimensions;
        const labels = ['X', 'Y', 'Z', 'W', 'V', 'U', 'T', 'S', 'R', 'Q'];
        const dimLabels = labels.slice(0, dims).join(', ');
        dimInfo.textContent = `Viewing: ${dimLabels} (${dims}D)`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new App();
});
