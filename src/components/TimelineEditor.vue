<template>
  <div class="timeline-editor w-full h-full">
    <svg
      ref="timelineSvg"
      :width="svgWidth"
      :height="svgHeight"
      class="w-full h-full bg-white border border-gray-200 rounded cursor-crosshair"
      @mousedown="startSelection"
      @mousemove="updateSelection"
      @mouseup="endSelection"
      @mouseleave="endSelection"
    >
      <!-- Timeline background -->
      <rect
        x="40"
        y="20"
        :width="timelineWidth"
        :height="timelineHeight"
        fill="#f9fafb"
        stroke="#e5e7eb"
        stroke-width="1"
      />
      
      <!-- Time scale markers -->
      <g v-for="(marker, index) in timeMarkers" :key="index">
        <line
          :x1="marker.x"
          y1="20"
          :x2="marker.x"
          :y2="30"
          stroke="#9ca3af"
          stroke-width="1"
        />
        <text
          :x="marker.x"
          y="15"
          class="text-xs fill-gray-600"
          text-anchor="middle"
        >
          {{ formatTime(marker.time) }}
        </text>
      </g>
      
      <!-- Existing lap segments -->
      <g v-for="lap in editedLaps" :key="lap.id">
        <rect
          :x="timeToX(lap.startTime)"
          y="20"
          :width="timeToX(lap.endTime) - timeToX(lap.startTime)"
          :height="timelineHeight"
          :fill="lap.color"
          :opacity="selectedLap?.id === lap.id ? 0.8 : 0.6"
          :stroke="selectedLap?.id === lap.id ? lap.color : 'transparent'"
          stroke-width="2"
          class="cursor-pointer"
          @click="selectLap(lap)"
        />
        
        <!-- Lap boundary handles -->
        <circle
          :cx="timeToX(lap.startTime)"
          :cy="20 + timelineHeight / 2"
          r="6"
          :fill="lap.color"
          stroke="white"
          stroke-width="2"
          class="cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
          @mousedown.stop="startDragBoundary(lap.id, 'start', $event)"
        />
        <circle
          :cx="timeToX(lap.endTime)"
          :cy="20 + timelineHeight / 2"
          r="6"
          :fill="lap.color"
          stroke="white"
          stroke-width="2"
          class="cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
          @mousedown.stop="startDragBoundary(lap.id, 'end', $event)"
        />
        
        <!-- Lap label -->
        <text
          :x="timeToX(lap.startTime) + (timeToX(lap.endTime) - timeToX(lap.startTime)) / 2"
          :y="20 + timelineHeight / 2 + 4"
          class="text-xs fill-white font-medium pointer-events-none"
          text-anchor="middle"
        >
          {{ lap.name }}
        </text>
      </g>
      
      <!-- Selection rectangle -->
      <rect
        v-if="selectionRect"
        :x="selectionRect.x"
        :y="selectionRect.y"
        :width="selectionRect.width"
        :height="selectionRect.height"
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3b82f6"
        stroke-width="1"
        stroke-dasharray="4,2"
      />
      
      <!-- Current selection range -->
      <g v-if="selectedTimeRange">
        <rect
          :x="timeToX(selectedTimeRange.startTime)"
          y="20"
          :width="timeToX(selectedTimeRange.endTime) - timeToX(selectedTimeRange.startTime)"
          :height="timelineHeight"
          fill="rgba(34, 197, 94, 0.3)"
          stroke="#22c55e"
          stroke-width="2"
          stroke-dasharray="4,2"
        />
        
        <!-- Selection handles -->
        <rect
          :x="timeToX(selectedTimeRange.startTime) - 4"
          y="16"
          width="8"
          :height="timelineHeight + 8"
          fill="#22c55e"
          class="cursor-ew-resize"
          @mousedown.stop="startDragSelection('start', $event)"
        />
        <rect
          :x="timeToX(selectedTimeRange.endTime) - 4"
          y="16"
          width="8"
          :height="timelineHeight + 8"
          fill="#22c55e"
          class="cursor-ew-resize"
          @mousedown.stop="startDragSelection('end', $event)"
        />
        
        <!-- Selection info -->
        <text
          :x="timeToX(selectedTimeRange.startTime) + (timeToX(selectedTimeRange.endTime) - timeToX(selectedTimeRange.startTime)) / 2"
          :y="20 + timelineHeight + 15"
          class="text-xs fill-gray-700 font-medium"
          text-anchor="middle"
        >
          {{ formatTime(selectedTimeRange.endTime - selectedTimeRange.startTime) }}
        </text>
      </g>
    </svg>
    
    <!-- Hover tooltip -->
    <div
      v-if="hoverInfo"
      :style="{
        position: 'absolute',
        left: hoverInfo.x + 'px',
        top: hoverInfo.y + 'px',
        transform: 'translate(-50%, -100%)'
      }"
      class="bg-gray-900 text-white px-2 py-1 rounded text-xs pointer-events-none z-10"
    >
      {{ formatTime(hoverInfo.time) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { ParsedFitFile } from '@/types/fitData';
import { fitParser } from '@/utils/fitParser';

// Props
interface Props {
  fitFile: ParsedFitFile;
  editedLaps: EditableLap[];
  selectedTimeRange: TimeRange | null;
  selectedLap?: EditableLap | null;
}

// Types
interface EditableLap {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  color: string;
  isNew: boolean;
  isDeleted: boolean;
}

interface TimeRange {
  startTime: number;
  endTime: number;
}

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  startTime: number;
  endTime: number;
}

interface HoverInfo {
  x: number;
  y: number;
  time: number;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'lap-select': [lap: EditableLap];
  'time-range-select': [range: TimeRange];
  'lap-boundary-drag': [lapId: string, newStartTime: number, newEndTime: number];
  'timeline-hover': [time: number | null];
}>();

// Refs
const timelineSvg = ref<SVGElement | null>(null);

// State
const svgWidth = ref(800);
const svgHeight = ref(120);
const timelineWidth = ref(720);
const timelineHeight = ref(60);
const isSelecting = ref(false);
const selectionStart = ref({ x: 0, time: 0 });
const selectionRect = ref<SelectionRect | null>(null);
const hoverInfo = ref<HoverInfo | null>(null);
const isDragging = ref<{
  type: 'boundary' | 'selection';
  lapId?: string;
  boundaryType?: 'start' | 'end';
  selectionType?: 'start' | 'end';
} | null>(null);

// Computed
const totalDuration = computed(() => {
  if (!props.fitFile.metadata.totalTime) return 1;
  return props.fitFile.metadata.totalTime;
});

const timeMarkers = computed(() => {
  const markers = [];
  const duration = totalDuration.value;
  const markerCount = Math.min(10, Math.floor(duration / 60)); // Every minute or fewer markers
  const interval = duration / markerCount;
  
  for (let i = 0; i <= markerCount; i++) {
    const time = i * interval;
    markers.push({
      time,
      x: timeToX(time)
    });
  }
  
  return markers;
});

// Methods
function timeToX(time: number): number {
  const ratio = time / totalDuration.value;
  return 40 + ratio * timelineWidth.value;
}

function xToTime(x: number): number {
  const ratio = (x - 40) / timelineWidth.value;
  return Math.max(0, Math.min(totalDuration.value, ratio * totalDuration.value));
}

function getMousePosition(event: MouseEvent): { x: number; y: number } {
  if (!timelineSvg.value) return { x: 0, y: 0 };
  
  const rect = timelineSvg.value.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function startSelection(event: MouseEvent) {
  const pos = getMousePosition(event);
  const time = xToTime(pos.x);
  
  if (pos.x < 40 || pos.x > 40 + timelineWidth.value) return;
  
  isSelecting.value = true;
  selectionStart.value = { x: pos.x, time };
  selectionRect.value = {
    x: pos.x,
    y: 20,
    width: 0,
    height: timelineHeight.value,
    startTime: time,
    endTime: time
  };
  
  event.preventDefault();
}

function updateSelection(event: MouseEvent) {
  const pos = getMousePosition(event);
  
  // Update hover info and emit timeline hover event
  if (pos.x >= 40 && pos.x <= 40 + timelineWidth.value) {
    const hoverTime = xToTime(pos.x);
    hoverInfo.value = {
      x: pos.x,
      y: pos.y - 20,
      time: hoverTime
    };
    emit('timeline-hover', hoverTime);
  } else {
    hoverInfo.value = null;
    emit('timeline-hover', null);
  }
  
  // Handle dragging
  if (isDragging.value) {
    handleDragging(event);
    return;
  }
  
  // Handle selection
  if (isSelecting.value && selectionRect.value) {
    const currentX = Math.max(40, Math.min(40 + timelineWidth.value, pos.x));
    const currentTime = xToTime(currentX);
    
    const startX = Math.min(selectionStart.value.x, currentX);
    const endX = Math.max(selectionStart.value.x, currentX);
    const startTime = Math.min(selectionStart.value.time, currentTime);
    const endTime = Math.max(selectionStart.value.time, currentTime);
    
    selectionRect.value = {
      x: startX,
      y: 20,
      width: endX - startX,
      height: timelineHeight.value,
      startTime,
      endTime
    };
  }
}

function endSelection(event: MouseEvent) {
  if (isSelecting.value && selectionRect.value) {
    const { startTime, endTime } = selectionRect.value;
    
    if (endTime - startTime > 5) { // Minimum 5 seconds selection
      emit('time-range-select', { startTime, endTime });
    }
    
    isSelecting.value = false;
    selectionRect.value = null;
  }
  
  isDragging.value = null;
  
  // Clear hover when mouse leaves or selection ends
  emit('timeline-hover', null);
}

function selectLap(lap: EditableLap) {
  emit('lap-select', lap);
}

function startDragBoundary(lapId: string, boundaryType: 'start' | 'end', event: MouseEvent) {
  isDragging.value = {
    type: 'boundary',
    lapId,
    boundaryType
  };
  event.preventDefault();
  event.stopPropagation();
}

function startDragSelection(selectionType: 'start' | 'end', event: MouseEvent) {
  isDragging.value = {
    type: 'selection',
    selectionType
  };
  event.preventDefault();
  event.stopPropagation();
}

function handleDragging(event: MouseEvent) {
  if (!isDragging.value) return;
  
  const pos = getMousePosition(event);
  const time = xToTime(pos.x);
  
  if (isDragging.value.type === 'boundary' && isDragging.value.lapId) {
    const lap = props.editedLaps.find(l => l.id === isDragging.value!.lapId);
    if (!lap) return;
    
    let newStartTime = lap.startTime;
    let newEndTime = lap.endTime;
    
    if (isDragging.value.boundaryType === 'start') {
      newStartTime = Math.max(0, Math.min(time, lap.endTime - 5)); // Min 5s lap
    } else {
      newEndTime = Math.max(lap.startTime + 5, Math.min(time, totalDuration.value));
    }
    
    emit('lap-boundary-drag', lap.id, newStartTime, newEndTime);
  }
  
  if (isDragging.value.type === 'selection' && props.selectedTimeRange) {
    const range = { ...props.selectedTimeRange };
    
    if (isDragging.value.selectionType === 'start') {
      range.startTime = Math.max(0, Math.min(time, range.endTime - 5));
    } else {
      range.endTime = Math.max(range.startTime + 5, Math.min(time, totalDuration.value));
    }
    
    emit('time-range-select', range);
  }
}

function formatTime(seconds: number): string {
  return fitParser.formatTime(seconds);
}

function handleResize() {
  if (timelineSvg.value) {
    const rect = timelineSvg.value.getBoundingClientRect();
    svgWidth.value = rect.width;
    timelineWidth.value = Math.max(400, rect.width - 80);
  }
}

// Lifecycle
onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
  
  // Prevent context menu on right click
  if (timelineSvg.value) {
    timelineSvg.value.addEventListener('contextmenu', (e) => e.preventDefault());
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.timeline-editor {
  position: relative;
  user-select: none;
}

.cursor-crosshair {
  cursor: crosshair;
}

.cursor-ew-resize {
  cursor: ew-resize;
}

/* Smooth transitions for interactive elements */
rect, circle {
  transition: opacity 0.2s ease;
}
</style>
