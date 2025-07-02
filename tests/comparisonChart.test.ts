import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useComparisonStore } from '@/stores/comparison';
import { useFitFilesStore } from '@/stores/fitFiles';

// Mock Chart.js completely
vi.mock('chart.js', () => {
  const mockChart = {
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
    toBase64Image: vi.fn(() => 'data:image/png;base64,mock-image-data')
  };
  
  const MockChart = vi.fn().mockImplementation(() => mockChart);
  MockChart.register = vi.fn();
  
  return {
    Chart: MockChart,
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
    Filler: vi.fn()
  };
});

// Import after mocking
import ComparisonChart from '@/components/ComparisonChart.vue';

describe('ComparisonChart', () => {
  let comparisonStore: ReturnType<typeof useComparisonStore>;
  let fitFilesStore: ReturnType<typeof useFitFilesStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    comparisonStore = useComparisonStore();
    fitFilesStore = useFitFilesStore();
  });

  it('should render placeholder when no data is available', () => {
    const wrapper = mount(ComparisonChart);
    
    expect(wrapper.find('.text-gray-500').exists()).toBe(true);
    expect(wrapper.text()).toContain('No Data to Display');
  });

  it('should show data streams placeholder when no streams are enabled', () => {
    // Mock some basic data but no enabled streams
    comparisonStore.selection.baseline = {
      id: 'test-1',
      filename: 'test.fit',
      lapNumber: 1,
      duration: 100,
      distance: 1000,
      records: [{ heart_rate: 120, power: 200, cadence: 80 }],
      metadata: {}
    };
    comparisonStore.selection.comparisons = [
      {
        id: 'test-2',
        filename: 'test2.fit',
        lapNumber: 2,
        duration: 105,
        distance: 1050,
        records: [{ heart_rate: 125, power: 205, cadence: 82 }],
        metadata: {}
      }
    ];

    const wrapper = mount(ComparisonChart);
    
    expect(wrapper.text()).toContain('No Data Streams Selected');
  });

  it('should display chart controls when data is available', async () => {
    // Mock baseline and comparison data
    const mockLap = {
      id: 'test-1',
      filename: 'test.fit',
      lapNumber: 1,
      duration: 100,
      distance: 1000,
      records: [
        { heart_rate: 120, power: 200, cadence: 80, speed: 10, altitude: 100 },
        { heart_rate: 125, power: 210, cadence: 82, speed: 11, altitude: 105 }
      ],
      metadata: {
        avgHeartRate: 122,
        maxHeartRate: 125,
        avgPower: 205,
        maxPower: 210
      }
    };

    comparisonStore.selection.baseline = mockLap;
    comparisonStore.selection.comparisons = [{ ...mockLap, id: 'test-2', lapNumber: 2 }];
    
    // Enable heart rate stream
    comparisonStore.dataStreamSettings.heart_rate.enabled = true;

    const wrapper = mount(ComparisonChart);
    await wrapper.vm.$nextTick();

    // Should show chart controls
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Time-based X-axis');
    expect(wrapper.text()).toContain('Normalize data');
    expect(wrapper.text()).toContain('Export');
    expect(wrapper.text()).toContain('Fullscreen');
  });

  it('should display legend with baseline and comparison laps', async () => {
    const mockBaseline = {
      id: 'baseline-1',
      filename: 'baseline.fit',
      lapNumber: 1,
      duration: 100,
      distance: 1000,
      records: [{ heart_rate: 120, power: 200, cadence: 80 }],
      metadata: {}
    };

    const mockComparison = {
      id: 'comparison-1',
      filename: 'comparison.fit',
      lapNumber: 2,
      duration: 105,
      distance: 1050,
      records: [{ heart_rate: 125, power: 205, cadence: 82 }],
      metadata: {}
    };

    comparisonStore.selection.baseline = mockBaseline;
    comparisonStore.selection.comparisons = [mockComparison];
    comparisonStore.dataStreamSettings.heart_rate.enabled = true;

    const wrapper = mount(ComparisonChart);
    await wrapper.vm.$nextTick();

    // Should show legend
    expect(wrapper.text()).toContain('baseline.fit - Lap 1 (Baseline)');
    expect(wrapper.text()).toContain('comparison.fit - Lap 2');
  });

  it('should show enabled data streams in the legend', async () => {
    const mockLap = {
      id: 'test-1',
      filename: 'test.fit',
      lapNumber: 1,
      duration: 100,
      distance: 1000,
      records: [{ heart_rate: 120, power: 200, cadence: 80 }],
      metadata: {}
    };

    comparisonStore.selection.baseline = mockLap;
    comparisonStore.selection.comparisons = [{ ...mockLap, id: 'test-2' }];
    
    // Enable multiple streams
    comparisonStore.dataStreamSettings.heart_rate.enabled = true;
    comparisonStore.dataStreamSettings.power.enabled = true;
    comparisonStore.dataStreamSettings.cadence.enabled = true;

    const wrapper = mount(ComparisonChart);
    await wrapper.vm.$nextTick();

    // Should show enabled streams
    expect(wrapper.text()).toContain('Heart Rate');
    expect(wrapper.text()).toContain('Power');
    expect(wrapper.text()).toContain('Cadence');
  });

  it('should handle refresh chart action', async () => {
    const mockLap = {
      id: 'test-1',
      filename: 'test.fit',
      lapNumber: 1,
      duration: 100,
      distance: 1000,
      records: [{ heart_rate: 120, power: 200, cadence: 80 }],
      metadata: {}
    };

    comparisonStore.selection.baseline = mockLap;
    comparisonStore.selection.comparisons = [{ ...mockLap, id: 'test-2' }];
    comparisonStore.dataStreamSettings.heart_rate.enabled = true;

    const wrapper = mount(ComparisonChart);
    await wrapper.vm.$nextTick();

    // Find refresh button by text content
    const buttons = wrapper.findAll('button');
    const refreshButton = buttons.find(button => button.text().includes('Refresh'));
    expect(refreshButton).toBeDefined();
    
    // Should be able to click refresh without errors
    if (refreshButton) {
      await refreshButton.trigger('click');
    }
  });
});
