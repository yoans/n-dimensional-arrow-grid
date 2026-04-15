class GridRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 40;
        this.padding = 20;
        this.animationProgress = 1;
        this.previousCells = [];
        this.currentCells = [];
        this.selectedShape = 'arrow-up';
        
        this.setupCanvas();
        this.setupInteraction();
    }
    
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        this.canvas.width = (rect.width - 40) * dpr;
        this.canvas.height = (rect.height - 40) * dpr;
        this.canvas.style.width = `${rect.width - 40}px`;
        this.canvas.style.height = `${rect.height - 40}px`;
        
        this.ctx.scale(dpr, dpr);
    }
    
    setupInteraction() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleClick(x, y);
        });
    }
    
    handleClick(x, y) {
        if (!this.grid) return;
        
        const offsetX = (this.canvas.clientWidth / 2) - (this.grid.size * this.cellSize / 2);
        const offsetY = (this.canvas.clientHeight / 2) - (this.grid.size * this.cellSize / 2);
        
        const gridX = Math.floor((x - offsetX) / this.cellSize);
        const gridY = Math.floor((y - offsetY) / this.cellSize);
        
        if (gridX >= 0 && gridX < this.grid.size && gridY >= 0 && gridY < this.grid.size) {
            const coords = new Array(this.grid.dimensions).fill(0);
            coords[0] = gridX;
            coords[1] = gridY;
            
            if (this.selectedShape === 'empty') {
                this.grid.grid.delete(this.grid.coordsToKey(coords));
            } else {
                this.grid.setCell(coords, { 
                    type: this.selectedShape,
                    dimension: 0
                });
            }
        }
    }
    
    render(grid, animationProgress = 1) {
        this.grid = grid;
        this.animationProgress = animationProgress;
        
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.ctx.clearRect(0, 0, width, height);
        
        if (grid.dimensions === 2) {
            this.render2D(grid);
        } else if (grid.dimensions === 3) {
            this.render3D(grid);
        } else {
            this.renderND(grid);
        }
    }
    
    render2D(grid) {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        const offsetX = (width / 2) - (grid.size * this.cellSize / 2);
        const offsetY = (height / 2) - (grid.size * this.cellSize / 2);
        
        for (let y = 0; y < grid.size; y++) {
            for (let x = 0; x < grid.size; x++) {
                const cell = grid.getCell([x, y]);
                const screenX = offsetX + x * this.cellSize;
                const screenY = offsetY + y * this.cellSize;
                
                this.drawGridCell(screenX, screenY);
                
                if (cell.type !== 'empty') {
                    this.drawCell(screenX, screenY, cell);
                }
            }
        }
    }
    
    render3D(grid) {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        const sliceSize = Math.min(
            (width - 100) / grid.size,
            (height - 100) / grid.size
        );
        
        for (let z = 0; z < grid.size; z++) {
            const offsetX = 50 + (z * 15);
            const offsetY = 50 + (z * 15);
            
            this.ctx.globalAlpha = 1 - (z / grid.size) * 0.5;
            
            for (let y = 0; y < grid.size; y++) {
                for (let x = 0; x < grid.size; x++) {
                    const cell = grid.getCell([x, y, z]);
                    const screenX = offsetX + x * sliceSize;
                    const screenY = offsetY + y * sliceSize;
                    
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    this.ctx.strokeRect(screenX, screenY, sliceSize, sliceSize);
                    
                    if (cell.type !== 'empty') {
                        this.drawCell(screenX, screenY, cell, sliceSize);
                    }
                }
            }
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    renderND(grid) {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        const cells = grid.getAllCells();
        
        const projectedCells = cells.map(cell => {
            const projected = this.projectND(cell.coords, grid.dimensions);
            return { ...cell, x: projected.x, y: projected.y, depth: projected.depth };
        });
        
        projectedCells.sort((a, b) => a.depth - b.depth);
        
        const offsetX = width / 2;
        const offsetY = height / 2;
        
        for (const cell of projectedCells) {
            const screenX = offsetX + cell.x;
            const screenY = offsetY + cell.y;
            const size = this.cellSize * (1 + cell.depth / 10);
            
            this.ctx.globalAlpha = 0.5 + (cell.depth + 5) / 10;
            this.drawCell(screenX - size/2, screenY - size/2, cell, size);
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    projectND(coords, dimensions) {
        let x = coords[0] * this.cellSize;
        let y = coords[1] * this.cellSize;
        let depth = 0;
        
        for (let i = 2; i < dimensions; i++) {
            const angle = (i - 2) * Math.PI / 4;
            const scale = Math.pow(0.7, i - 2);
            x += coords[i] * this.cellSize * Math.cos(angle) * scale;
            y += coords[i] * this.cellSize * Math.sin(angle) * scale;
            depth += coords[i];
        }
        
        return { x, y, depth };
    }
    
    drawGridCell(x, y) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
    }
    
    drawCell(x, y, cell, size = this.cellSize) {
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        
        const scale = this.animationProgress;
        this.ctx.scale(scale, scale);
        
        switch (cell.type) {
            case 'arrow-up':
                this.drawArrow(0, -1, size);
                break;
            case 'arrow-down':
                this.drawArrow(0, 1, size);
                break;
            case 'arrow-left':
                this.drawArrow(-1, 0, size);
                break;
            case 'arrow-right':
                this.drawArrow(1, 0, size);
                break;
            case 'block':
                this.drawBlock(size);
                break;
        }
        
        this.ctx.restore();
    }
    
    drawArrow(dx, dy, size) {
        const arrowSize = size * 0.6;
        
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        
        const angle = Math.atan2(dy, dx) - Math.PI / 2;
        this.ctx.rotate(angle);
        
        this.ctx.moveTo(0, -arrowSize / 2);
        this.ctx.lineTo(arrowSize / 3, arrowSize / 4);
        this.ctx.lineTo(0, 0);
        this.ctx.lineTo(-arrowSize / 3, arrowSize / 4);
        this.ctx.closePath();
        
        this.ctx.fill();
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    drawBlock(size) {
        const blockSize = size * 0.7;
        this.ctx.fillStyle = '#FF5722';
        this.ctx.fillRect(-blockSize / 2, -blockSize / 2, blockSize, blockSize);
        this.ctx.strokeStyle = '#D84315';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-blockSize / 2, -blockSize / 2, blockSize, blockSize);
    }
    
    setSelectedShape(shape) {
        this.selectedShape = shape;
    }
}
