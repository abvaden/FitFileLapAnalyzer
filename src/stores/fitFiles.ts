import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ParsedFitFile, LapSegment } from '@/types/fitData';
import { fitParser } from '@/utils/fitParser';

export const useFitFilesStore = defineStore('fitFiles', () => {
  // State
  const files = ref<ParsedFitFile[]>([]);
  const laps = ref<LapSegment[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const fileCount = computed(() => files.value.length);
  const totalLaps = computed(() => laps.value.length);
  const lapsByFile = computed(() => {
    const grouped: Record<string, LapSegment[]> = {};
    laps.value.forEach(lap => {
      if (!grouped[lap.fileId]) {
        grouped[lap.fileId] = [];
      }
      grouped[lap.fileId].push(lap);
    });
    return grouped;
  });

  // Actions
  async function addFile(file: File): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // Check if file is already loaded
      const existingFile = files.value.find(f => f.filename === file.name);
      if (existingFile) {
        throw new Error(`File "${file.name}" is already loaded`);
      }

      // Parse the FIT file
      const parsedFile = await fitParser.parseFile(file);
      
      // Add to files array
      files.value.push(parsedFile);

      // Extract and add laps
      const fileLaps = fitParser.extractLaps(parsedFile);
      laps.value.push(...fileLaps);

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function addFiles(fileList: File[]): Promise<void> {
    const errors: string[] = [];
    
    for (const file of fileList) {
      try {
        await addFile(file);
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      error.value = `Some files failed to load:\n${errors.join('\n')}`;
    }
  }

  function removeFile(fileId: string): void {
    // Remove file
    const fileIndex = files.value.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
      files.value.splice(fileIndex, 1);
    }

    // Remove associated laps
    laps.value = laps.value.filter(lap => lap.fileId !== fileId);
  }

  function clearAll(): void {
    files.value = [];
    laps.value = [];
    error.value = null;
  }

  function getFileById(fileId: string): ParsedFitFile | undefined {
    return files.value.find(f => f.id === fileId);
  }

  function getLapById(lapId: string): LapSegment | undefined {
    return laps.value.find(lap => lap.id === lapId);
  }

  function getLapsByFileId(fileId: string): LapSegment[] {
    return laps.value.filter(lap => lap.fileId === fileId);
  }

  async function addStravaActivity(parsedActivity: ParsedFitFile): Promise<void> {
    try {
      // Check if activity is already loaded
      const existingFile = files.value.find(f => f.id === parsedActivity.id);
      if (existingFile) {
        throw new Error(`Activity "${parsedActivity.filename}" is already loaded`);
      }

      // Add to files array
      files.value.push(parsedActivity);

      // Extract and add laps - we need to create LapSegments from the parsed activity
      const activityLaps: LapSegment[] = parsedActivity.data.laps.map((lap, index) => ({
        id: `${parsedActivity.id}_lap_${index + 1}`,
        fileId: parsedActivity.id,
        filename: parsedActivity.filename,
        lapNumber: index + 1,
        startTime: lap.start_time,
        endTime: lap.start_time + lap.total_elapsed_time,
        duration: lap.total_elapsed_time,
        distance: lap.total_distance,
        records: parsedActivity.data.records.filter(record => 
          record.timestamp >= lap.start_time && 
          record.timestamp <= lap.start_time + lap.total_elapsed_time
        ),
        lapData: lap,
        metadata: {
          avgHeartRate: lap.avg_heart_rate,
          maxHeartRate: lap.max_heart_rate,
          avgPower: lap.avg_power,
          maxPower: lap.max_power,
          avgCadence: lap.avg_cadence,
          maxCadence: lap.max_cadence,
          avgSpeed: lap.avg_speed,
          maxSpeed: lap.max_speed,
          calories: lap.total_calories,
        }
      }));

      laps.value.push(...activityLaps);

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      throw err;
    }
  }

  function updateFileLaps(fileId: string, editedLaps: any[]): void {
    // Remove existing laps for this file
    laps.value = laps.value.filter(lap => lap.fileId !== fileId);
    
    // Convert edited laps to LapSegments and add them
    const newLaps: LapSegment[] = editedLaps.map((editedLap, index) => ({
      id: editedLap.id,
      fileId: editedLap.fileId,
      filename: editedLap.filename,
      lapNumber: index + 1, // Renumber sequentially
      startTime: editedLap.startTime,
      endTime: editedLap.endTime,
      duration: editedLap.duration,
      distance: editedLap.distance,
      records: editedLap.records,
      lapData: editedLap.lapData,
      metadata: editedLap.metadata
    }));
    
    laps.value.push(...newLaps);
    
    // Update file metadata
    const file = files.value.find(f => f.id === fileId);
    if (file) {
      file.metadata.lapCount = newLaps.length;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    files,
    laps,
    isLoading,
    error,
    
    // Getters
    fileCount,
    totalLaps,
    lapsByFile,
    
    // Actions
    addFile,
    addFiles,
    addStravaActivity,
    removeFile,
    clearAll,
    getFileById,
    getLapById,
    getLapsByFileId,
    updateFileLaps,
    clearError,
  };
});
