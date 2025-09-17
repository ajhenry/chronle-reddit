import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import { DraggableItem, Grid, GridPosition, ItemShape } from '../components/tile-grid/tile-grid';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface DevPageProps {
  onBack?: () => void;
}

// Predefined shapes
const PREDEFINED_SHAPES: Record<string, ItemShape> = {
  single: {
    name: 'single',
    cells: [{ x: 0, y: 0 }],
    width: 1,
    height: 1,
  },
  horizontal2: {
    name: 'horizontal2',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    width: 2,
    height: 1,
  },
  vertical2: {
    name: 'vertical2',
    cells: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ],
    width: 1,
    height: 2,
  },
  L: {
    name: 'L',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ],
    width: 2,
    height: 2,
  },
  U: {
    name: 'U',
    cells: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    width: 3,
    height: 2,
  },
  T: {
    name: 'T',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ],
    width: 3,
    height: 2,
  },
  plus: {
    name: 'plus',
    cells: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    width: 3,
    height: 3,
  },
};

export const DevPage = ({ onBack }: DevPageProps) => {
  const [grid1Items, setGrid1Items] = useState<Omit<DraggableItem, 'id'>[]>([
    {
      position: { x: 1, y: 1 },
      shape: PREDEFINED_SHAPES.L!,
      content: 'L',
      className: 'bg-blue-500 text-white',
    },
    {
      position: { x: 4, y: 2 },
      shape: PREDEFINED_SHAPES.U!,
      content: 'U',
      className: 'bg-green-500 text-white',
    },
    {
      position: { x: 0, y: 4 },
      shape: PREDEFINED_SHAPES.T!,
      content: 'T',
      className: 'bg-yellow-500 text-black',
    },
    {
      position: { x: 6, y: 0 },
      shape: PREDEFINED_SHAPES.single!,
      content: '🔒',
      className: 'bg-gray-500 text-white',
      disabled: true, // This piece is locked and cannot be moved
    },
  ]);

  const [grid2Items, setGrid2Items] = useState<Omit<DraggableItem, 'id'>[]>([
    {
      position: { x: 0, y: 0 },
      shape: PREDEFINED_SHAPES.single!,
      content: '1',
      className: 'bg-purple-500 text-white',
    },
    {
      position: { x: 2, y: 1 },
      shape: PREDEFINED_SHAPES.plus!,
      content: '+',
      className: 'bg-red-500 text-white',
    },
    {
      position: { x: 1, y: 3 },
      shape: PREDEFINED_SHAPES.vertical2!,
      content: 'I',
      className: 'bg-indigo-500 text-white',
    },
    {
      position: { x: 4, y: 0 },
      shape: PREDEFINED_SHAPES.L!,
      content: '🔒',
      className: 'bg-red-400 text-white',
      disabled: true, // This piece is locked and cannot be moved
    },
  ]);

  const handleGrid1ItemMove = useCallback((item: DraggableItem, newPosition: GridPosition) => {
    setGrid1Items((prev) =>
      prev.map((prevItem) =>
        prevItem.content === item.content ? { ...prevItem, position: newPosition } : prevItem
      )
    );
  }, []);

  const handleGrid2ItemMove = useCallback((item: DraggableItem, newPosition: GridPosition) => {
    setGrid2Items((prev) =>
      prev.map((prevItem) =>
        prevItem.content === item.content ? { ...prevItem, position: newPosition } : prevItem
      )
    );
  }, []);

  const handleGrid1LayoutChange = useCallback((layout: (string | null)[][]) => {
    console.log('Grid 1 Layout Change:', layout);
  }, []);

  const handleGrid2LayoutChange = useCallback((layout: (string | null)[][]) => {
    console.log('Grid 2 Layout Change:', layout);
  }, []);
  return (
    <div className="p-2 sm:p-4 min-h-screen bg-background">
      <div className="mx-auto space-y-4 sm:space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex gap-3 items-center">
            <div className="p-2 rounded-full bg-primary/20">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Development Tools</h1>
              <p className="text-sm text-muted-foreground">
                Development utilities and testing tools
              </p>
            </div>
          </div>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back
            </Button>
          )}
        </div>

        {/* DND Kit Grid Layout Example */}
        <div className="w-full h-full">
          <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-100">
            <div className="mx-auto max-w-7xl">
              <h1 className="mb-6 sm:mb-8 text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-800">
                Dragging Grid System Demo
              </h1>

              <div className="mb-6 sm:mb-8">
                <p className="mx-auto max-w-3xl text-center text-gray-600 px-2">
                  This demo showcases a custom grid system with unique IDs for each grid instance.
                  Each grid generates predictable IDs for its cells and items. Try dragging the L,
                  U, T, and Plus shapes around to see the drag preview, boundary validation, and
                  collision detection in action.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:gap-8 mb-6 sm:mb-8 lg:grid-cols-2">
                {/* First Grid */}
                <div className="p-4 sm:p-6 rounded-lg shadow-lg bg-background">
                  <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-semibold text-gray-800">
                    Grid Instance 1
                  </h2>
                  <div className="mb-3 sm:mb-4">
                    <p className="text-xs sm:text-sm text-gray-600">
                      Grid Size: 8x6 | Cell Size: 40x40px
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <Grid
                      gridSize={{ width: 10, height: 8 }}
                      cellSize={{ width: 40, height: 40 }}
                      initialItems={grid1Items}
                      onItemMove={handleGrid1ItemMove}
                      onLayoutChange={handleGrid1LayoutChange}
                    />
                  </div>
                </div>

                {/* Second Grid */}
                <div className="p-4 sm:p-6 rounded-lg shadow-lg bg-background">
                  <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-semibold text-gray-800">
                    Grid Instance 2
                  </h2>
                  <div className="mb-3 sm:mb-4">
                    <p className="text-xs sm:text-sm text-gray-600">
                      Grid Size: 6x5 | Cell Size: 45x45px
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <Grid
                      gridSize={{ width: 6, height: 5 }}
                      cellSize={{ width: 45, height: 45 }}
                      initialItems={grid2Items}
                      onItemMove={handleGrid2ItemMove}
                      onLayoutChange={handleGrid2LayoutChange}
                    />
                  </div>
                </div>
              </div>

              {/* Features Section */}
              <div className="p-4 sm:p-6 rounded-lg shadow-lg bg-background">
                <h3 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-semibold text-gray-800">
                  Features
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-start space-3 sm:space-x-3">
                    <div className="flex flex-shrink-0 justify-center items-center w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-full mt-0.5">
                      <span className="text-xs sm:text-sm font-semibold text-white">1</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 sm:mb-2 text-sm sm:text-base font-semibold text-gray-800">
                        Arbitrary Shapes
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Support for L, U, T, Plus, and custom shapes with individual cell occupancy
                        tracking.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-3 sm:space-x-3">
                    <div className="flex flex-shrink-0 justify-center items-center w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-full mt-0.5">
                      <span className="text-xs sm:text-sm font-semibold text-white">2</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 sm:mb-2 text-sm sm:text-base font-semibold text-gray-800">
                        Tile-Level Tracking
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Each grid cell tracks which item occupies it and which part of the shape it
                        represents.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-3 sm:space-x-3">
                    <div className="flex flex-shrink-0 justify-center items-center w-7 h-7 sm:w-8 sm:h-8 bg-purple-500 rounded-full mt-0.5">
                      <span className="text-xs sm:text-sm font-semibold text-white">3</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 sm:mb-2 text-sm sm:text-base font-semibold text-gray-800">
                        Drag Preview
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        See a semi-transparent preview of where your shape will be placed before
                        dropping.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-3 sm:space-x-3">
                    <div className="flex flex-shrink-0 justify-center items-center w-7 h-7 sm:w-8 sm:h-8 bg-red-500 rounded-full mt-0.5">
                      <span className="text-xs sm:text-sm font-semibold text-white">4</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 sm:mb-2 text-sm sm:text-base font-semibold text-gray-800">
                        Visual Shape Rendering
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Each shape is rendered as individual cells showing its exact geometric form.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-3 sm:space-x-3">
                    <div className="flex flex-shrink-0 justify-center items-center w-7 h-7 sm:w-8 sm:h-8 bg-yellow-500 rounded-full mt-0.5">
                      <span className="text-xs sm:text-sm font-semibold text-white">5</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 sm:mb-2 text-sm sm:text-base font-semibold text-gray-800">
                        Unique Grid IDs
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Each grid instance gets a unique ID (e.g., grid-1, grid-2) for
                        identification.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-3 sm:space-x-3">
                    <div className="flex flex-shrink-0 justify-center items-center w-7 h-7 sm:w-8 sm:h-8 bg-indigo-500 rounded-full mt-0.5">
                      <span className="text-xs sm:text-sm font-semibold text-white">6</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 sm:mb-2 text-sm sm:text-base font-semibold text-gray-800">
                        Advanced Collision Detection
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Shape-based collision detection prevents overlaps and out-of-bounds
                        placement.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-3 sm:space-x-3">
                    <div className="flex flex-shrink-0 justify-center items-center w-7 h-7 sm:w-8 sm:h-8 bg-pink-500 rounded-full mt-0.5">
                      <span className="text-xs sm:text-sm font-semibold text-white">7</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 sm:mb-2 text-sm sm:text-base font-semibold text-gray-800">
                        Predictable Cell IDs
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Grid cells have predictable IDs like "grid-1-cell-2-3" for easy targeting
                        and debugging.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-3 sm:space-x-3">
                    <div className="flex flex-shrink-0 justify-center items-center w-7 h-7 sm:w-8 sm:h-8 bg-teal-500 rounded-full mt-0.5">
                      <span className="text-xs sm:text-sm font-semibold text-white">8</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 sm:mb-2 text-sm sm:text-base font-semibold text-gray-800">
                        Layout Change Callback
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        onLayoutChange callback provides a 2D array showing which item occupies each
                        cell, with console logging for debugging layout changes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Development Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Environment</h3>
                  <p className="text-sm text-muted-foreground">Development Mode</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Version</h3>
                  <p className="text-sm text-muted-foreground">Podium Dev Build</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Status</h3>
                  <p className="text-sm text-muted-foreground">Development page is working</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-10 sm:h-11 text-sm sm:text-base"
                  onClick={() => console.log('Dev action 1')}
                >
                  Debug Action 1
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 sm:h-11 text-sm sm:text-base"
                  onClick={() => console.log('Dev action 2')}
                >
                  Debug Action 2
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 sm:h-11 text-sm sm:text-base"
                  onClick={() => console.log('Dev action 3')}
                >
                  Debug Action 3
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 sm:h-11 text-sm sm:text-base"
                  onClick={() =>
                    toast('Hello from the dev page! This is a toast notification at the top.')
                  }
                >
                  Create Toast
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Development Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• This is the development page for Podium</p>
              <p>• Add any development tools or debugging utilities here</p>
              <p>• This page should only be accessible during development</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
