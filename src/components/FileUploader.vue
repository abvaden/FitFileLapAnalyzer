<template>
  <div class="card">
    <h3 class="text-lg font-medium text-gray-900 mb-4">Upload FIT Files</h3>
    
    <!-- Drop Zone -->
    <div
      @drop="handleDrop"
      @dragover.prevent
      @dragenter.prevent
      @dragleave="isDragOver = false"
      @dragover="isDragOver = true"
      :class="[
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200',
        isDragOver 
          ? 'border-primary-400 bg-primary-50' 
          : 'border-gray-300 hover:border-gray-400'
      ]"
    >
      <div class="flex flex-col items-center">
        <svg 
          class="w-8 h-8 text-gray-400 mb-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
          />
        </svg>
        
        <p class="text-sm text-gray-600 mb-2">
          <span class="font-medium">Click to upload</span> or drag and drop
        </p>
        
        <p class="text-xs text-gray-500">
          FIT files only
        </p>
        
        <input
          ref="fileInput"
          type="file"
          multiple
          accept=".fit"
          @change="handleFileSelect"
          class="hidden"
        >
        
        <button
          @click="fileInput?.click()"
          class="mt-3 btn btn-primary"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="flex items-center">
            <div class="spinner w-4 h-4 mr-2"></div>
            Processing...
          </span>
          <span v-else>Select Files</span>
        </button>
      </div>
    </div>
    
    <!-- Upload Progress -->
    <div v-if="isLoading" class="mt-4">
      <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
        <span>Processing files...</span>
        <span>{{ uploadProgress }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div 
          class="bg-primary-600 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${uploadProgress}%` }"
        ></div>
      </div>
    </div>
    
    <!-- File Validation Info -->
    <div class="mt-4 text-xs text-gray-500">
      <p class="mb-1">Supported file types: .fit</p>
      <p>Maximum file size: 50MB per file</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useFitFilesStore } from '@/stores/fitFiles';

// Store
const fitFilesStore = useFitFilesStore();

// Reactive state
const isDragOver = ref(false);
const isLoading = ref(false);
const uploadProgress = ref(0);

// File input ref
const fileInput = ref<HTMLInputElement>();

// Methods
async function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = false;
  
  const files = Array.from(event.dataTransfer?.files || []);
  await processFiles(files);
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  await processFiles(files);
  
  // Clear the input
  if (target) {
    target.value = '';
  }
}

async function processFiles(files: File[]) {
  if (files.length === 0) return;
  
  // Filter for .fit files only
  const fitFiles = files.filter(file => 
    file.name.toLowerCase().endsWith('.fit')
  );
  
  if (fitFiles.length === 0) {
    alert('Please select valid FIT files (.fit extension)');
    return;
  }
  
  // Check file sizes (50MB limit)
  const oversizedFiles = fitFiles.filter(file => file.size > 50 * 1024 * 1024);
  if (oversizedFiles.length > 0) {
    alert(`The following files are too large (max 50MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
    return;
  }
  
  isLoading.value = true;
  uploadProgress.value = 0;
  
  try {
    // Process files one by one with progress updates
    for (let i = 0; i < fitFiles.length; i++) {
      const file = fitFiles[i];
      
      try {
        await fitFilesStore.addFile(file);
        uploadProgress.value = Math.round(((i + 1) / fitFiles.length) * 100);
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        // Continue with other files
      }
    }
  } finally {
    isLoading.value = false;
    uploadProgress.value = 0;
  }
}
</script>
