import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useComparisonStore } from '@/stores/comparison';

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
import TimeAnalysis from '@/components/TimeAnalysis.vue';

describe('TimeAnalysis', () => {
  let comparisonStore: ReturnType<typeof useComparisonStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    comparisonStore = useComparisonStore();
  });

  it('should render time analysis modes', () => {
    const wrapper = mount(TimeAnalysis);
    
    expect(wrapper.find('select').exists()).toBe(true);
    expect(wrapper.text()).toContain('Final Times');
    expect(wrapper.text()).toContain('Split Analysis');
    expect(wrapper.text()).toContain('Time Gaps');
  });

  it('should show time gaps chart view toggle when comparisons exist', async () => {
    // Mock baseline and comparison data with time differences
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
      baselineLap: mockBaseline,
      comparisonLap: {
        id: 'comparison-lap-1',
        filename: 'comparison.fit',
        lapNumber: 2,
        duration: 105,
        distance: 1050,
        records: [{ heart_rate: 125, power: 205, cadence: 82 }],
        metadata: {}
      },
      timeDifferences: [
        { timestamp: 0, elapsedTime: 0, difference: 0, percentage: 0 },
        { timestamp: 50, elapsedTime: 50, difference: 2.5, percentage: 0.5 },
        { timestamp: 100, elapsedTime: 100, difference: 5, percentage: 1.0 }
      ],
      finalTimeDifference: 5,
      averageGap: 2.5,
      maxGap: 5,
      minGap: 0,
      crossoverPoints: []
    };

    comparisonStore.selection.baseline = mockBaseline;
    comparisonStore.comparisons = [mockComparison];

    const wrapper = mount(TimeAnalysis);
    
    // Switch to gaps mode
    const select = wrapper.find('select');
    await select.setValue('gaps');
    await wrapper.vm.$nextTick();

    // Should show view toggle buttons
    expect(wrapper.text()).toContain('Chart View');
    expect(wrapper.text()).toContain('Table View');
    expect(wrapper.text()).toContain('Percentage');
    expect(wrapper.text()).toContain('Elapsed Time');
    expect(wrapper.text()).toContain('Export');
  });

  it('should display gap analysis summary statistics', async () => {
    // Mock comparison data
    const mockComparison = {
      id: 'comparison-1',
      baselineLap: {
        id: 'baseline-1',
        filename: 'baseline.fit',
        lapNumber: 1,
        duration: 100,
        distance: 1000,
        records: [],
        metadata: {}
      },
      comparisonLap: {
        id: 'comparison-lap-1',
        filename: 'comparison.fit',
        lapNumber: 2,
        duration: 105,
        distance: 1050,
        records: [],
        metadata: {}
      },
      timeDifferences: [
        { timestamp: 0, elapsedTime: 0, difference: -2, percentage: 0 },
        { timestamp: 50, elapsedTime: 50, difference: 0, percentage: 0.5 },
        { timestamp: 100, elapsedTime: 100, difference: 5, percentage: 1.0 }
      ],
      finalTimeDifference: 5,
      averageGap: 1,
      maxGap: 5,
      minGap: -2,
      crossoverPoints: [50]
    };

    comparisonStore.comparisons = [mockComparison];

    const wrapper = mount(TimeAnalysis);
    
    // Switch to gaps mode
    const select = wrapper.find('select');
    await select.setValue('gaps');
    await wrapper.vm.$nextTick();

    // Should show summary statistics
    expect(wrapper.text()).toContain('Gap Analysis Summary');
    expect(wrapper.text()).toContain('Largest Lead');
    expect(wrapper.text()).toContain('Largest Deficit');
    expect(wrapper.text()).toContain('Total Crossovers');
    expect(wrapper.text()).toContain('Most Volatile');
  });

  it('should handle chart export functionality', async () => {
    // Mock comparison data
    const mockComparison = {
      id: 'comparison-1',
      baselineLap: {
        id: 'baseline-1',
        filename: 'baseline.fit',
        lapNumber: 1,
        duration: 100,
        distance: 1000,
        records: [],
        metadata: {}
      },
      comparisonLap: {
        id: 'comparison-lap-1',
        filename: 'comparison.fit',
        lapNumber: 2,
        duration: 105,
        distance: 1050,
        records: [],
        metadata: {}
      },
      timeDifferences: [
        { timestamp: 0, elapsedTime: 0, difference: 0, percentage: 0 },
        { timestamp: 100, elapsedTime: 100, difference: 5, percentage: 1.0 }
      ],
      finalTimeDifference: 5,
      averageGap: 2.5,
      maxGap: 5,
      minGap: 0,
      crossoverPoints: []
    };

    comparisonStore.comparisons = [mockComparison];

    const wrapper = mount(TimeAnalysis);
    
    // Switch to gaps mode
    const select = wrapper.find('select');
    await select.setValue('gaps');
    await wrapper.vm.$nextTick();

    // Should have export button
    const buttons = wrapper.findAll('button');
    const exportButton = buttons.find(button => button.text().includes('Export'));
    expect(exportButton).toBeDefined();
  });
});
