<template>
  <div class="fixed bottom-4 right-4 z-50">
    <div
      class="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md"
      role="alert"
    >
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium text-red-800">Error</h3>
          <div class="mt-1 text-sm text-red-700">
            <p>{{ message }}</p>
          </div>
        </div>
        <div class="ml-4 flex-shrink-0">
          <button
            @click="$emit('close')"
            class="inline-flex text-red-400 hover:text-red-600 focus:outline-none focus:text-red-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message: string;
}

defineProps<Props>();
defineEmits<{
  close: [];
}>();
</script>
