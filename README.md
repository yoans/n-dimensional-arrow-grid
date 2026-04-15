# N-Dimensional Arrow Grid

An interactive visualization of multi-dimensional cellular automata featuring arrows and blocks with unique movement and interaction rules.

## Features

- **N-Dimensional Support**: Adjustable from 2D up to 10D (uncapped slider)
- **Dynamic Grid Size**: Variable grid sizes from 2x2 to 20x20
- **Interactive Drawing**: Click to place arrows, blocks, or clear cells
- **Smooth Animations**: Configurable animation speed for state transitions
- **Real-time Visualization**: Multiple rendering modes for different dimensions

## Rules

### Arrow Movement
- Arrows move in their indicated direction along a specific dimension
- Movement happens one cell per step
- Arrows are reflected when hitting blocks or boundaries

### Interactions
- **Arrow + Empty**: Arrow moves into empty space
- **Arrow + Block**: Arrow reflects (reverses direction)
- **Arrow + Opposite Arrow**: Arrows annihilate (both disappear)
- **Arrow + Same Arrow**: Collision results in annihilation

### Blocks
- Blocks remain stationary
- Act as walls that reflect arrows

## Controls

- **Dimensions Slider**: Adjust the number of dimensions (2-10)
- **Grid Size Slider**: Change grid dimensions (2-20)
- **Animation Speed**: Control transition speed (0.1-3.0s)
- **Step**: Advance one step manually
- **Play/Pause**: Auto-advance the simulation
- **Reset**: Return to initial state
- **Shape Selector**: Choose which element to draw (↑ ↓ ← → ■ ○)

## Usage

1. Open `index.html` in a modern web browser
2. Adjust dimensions and grid size as desired
3. Click on the grid to place arrows or blocks
4. Use Step or Play to watch the simulation evolve
5. Experiment with different initial configurations!

## Technical Details

- Pure JavaScript implementation (no dependencies)
- HTML5 Canvas rendering
- Supports arbitrary dimensions with projection algorithms
- Smooth interpolation between states

## Visualization Modes

- **2D**: Standard top-down grid view
- **3D**: Layered slices with depth perception
- **4D+**: Projected view using dimensional reduction

Enjoy exploring multi-dimensional cellular automata!
