class NDimensionalGrid {
    constructor(dimensions, size) {
        this.dimensions = dimensions;
        this.size = size;
        this.grid = new Map();
        this.stepCount = 0;
        this.initialize();
    }
    
    initialize() {
        this.grid.clear();
        this.stepCount = 0;
        
        const centerCoords = new Array(this.dimensions).fill(Math.floor(this.size / 2));
        this.setCell(centerCoords, { type: 'arrow-up', direction: 0 });
    }
    
    coordsToKey(coords) {
        return coords.join(',');
    }
    
    keyToCoords(key) {
        return key.split(',').map(Number);
    }
    
    getCell(coords) {
        return this.grid.get(this.coordsToKey(coords)) || { type: 'empty' };
    }
    
    setCell(coords, value) {
        if (this.isInBounds(coords)) {
            this.grid.set(this.coordsToKey(coords), value);
        }
    }
    
    isInBounds(coords) {
        return coords.every(c => c >= 0 && c < this.size);
    }
    
    getNeighbors(coords) {
        const neighbors = [];
        for (let dim = 0; dim < this.dimensions; dim++) {
            for (let delta of [-1, 1]) {
                const neighborCoords = [...coords];
                neighborCoords[dim] += delta;
                if (this.isInBounds(neighborCoords)) {
                    neighbors.push({
                        coords: neighborCoords,
                        dimension: dim,
                        direction: delta > 0 ? 1 : -1
                    });
                }
            }
        }
        return neighbors;
    }
    
    step() {
        const newGrid = new Map();
        const cellsToProcess = new Set(this.grid.keys());
        
        for (const key of cellsToProcess) {
            const coords = this.keyToCoords(key);
            const cell = this.grid.get(key);
            
            if (cell.type === 'block') {
                newGrid.set(key, cell);
                continue;
            }
            
            if (cell.type === 'empty') {
                continue;
            }
            
            if (cell.type.startsWith('arrow')) {
                const moveResult = this.moveArrow(coords, cell);
                
                if (moveResult.newCoords) {
                    const newKey = this.coordsToKey(moveResult.newCoords);
                    const targetCell = this.grid.get(newKey) || { type: 'empty' };
                    
                    if (targetCell.type === 'empty') {
                        newGrid.set(newKey, moveResult.cell);
                    } else if (targetCell.type === 'block') {
                        const reflected = this.reflectArrow(cell);
                        newGrid.set(key, reflected);
                    } else {
                        const merged = this.mergeArrows(moveResult.cell, targetCell);
                        if (merged) {
                            newGrid.set(newKey, merged);
                        }
                    }
                }
            }
        }
        
        this.grid = newGrid;
        this.stepCount++;
    }
    
    moveArrow(coords, cell) {
        const direction = this.getArrowDirection(cell.type);
        const dimension = cell.dimension || 0;
        
        const newCoords = [...coords];
        newCoords[dimension] += direction;
        
        if (this.isInBounds(newCoords)) {
            return { newCoords, cell };
        }
        
        return { newCoords: null, cell };
    }
    
    getArrowDirection(type) {
        const dirMap = {
            'arrow-up': 1,
            'arrow-down': -1,
            'arrow-right': 1,
            'arrow-left': -1
        };
        return dirMap[type] || 1;
    }
    
    reflectArrow(cell) {
        const reflectMap = {
            'arrow-up': 'arrow-down',
            'arrow-down': 'arrow-up',
            'arrow-right': 'arrow-left',
            'arrow-left': 'arrow-right'
        };
        return { ...cell, type: reflectMap[cell.type] || cell.type };
    }
    
    mergeArrows(arrow1, arrow2) {
        if (arrow1.type === arrow2.type) {
            return null;
        }
        
        const opposites = [
            ['arrow-up', 'arrow-down'],
            ['arrow-left', 'arrow-right']
        ];
        
        for (const [a, b] of opposites) {
            if ((arrow1.type === a && arrow2.type === b) || 
                (arrow1.type === b && arrow2.type === a)) {
                return null;
            }
        }
        
        return arrow1;
    }
    
    getAllCells() {
        const cells = [];
        for (const [key, value] of this.grid.entries()) {
            cells.push({
                coords: this.keyToCoords(key),
                ...value
            });
        }
        return cells;
    }
    
    getActiveCellCount() {
        let count = 0;
        for (const value of this.grid.values()) {
            if (value.type !== 'empty') {
                count++;
            }
        }
        return count;
    }
    
    resize(dimensions, size) {
        this.dimensions = dimensions;
        this.size = size;
        this.initialize();
    }
}
