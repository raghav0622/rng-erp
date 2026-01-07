/**
 * RNG-Forms Test Utilities & Generators
 *
 * Helper functions for generating test data, mocking async operations,
 * and creating edge case scenarios for story and unit tests.
 */

// ============================================================================
// DATA GENERATORS
// ============================================================================

/**
 * Generate a large dataset for performance testing
 * @param count Number of items to generate
 * @param template Optional template for item structure
 */
export function generateLargeDataset<T = any>(count: number, template?: (index: number) => T): T[] {
  const defaultTemplate = (index: number) => ({
    id: `item-${index}`,
    name: `Item ${index + 1}`,
    value: Math.random() * 1000,
    category: `Category ${(index % 5) + 1}`,
    status: ['active', 'inactive', 'pending'][index % 3],
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
  });

  return Array.from({ length: count }, (_, index) =>
    template ? template(index) : defaultTemplate(index),
  ) as T[];
}

/**
 * Generate mock construction materials
 */
export function generateConstructionMaterials(count: number = 20) {
  const materials = [
    'Cement',
    'Steel',
    'Brick',
    'Sand',
    'Gravel',
    'Concrete',
    'Rebar',
    'Tiles',
    'Paint',
    'Glass',
    'Plywood',
    'Wood',
    'Drywall',
    'Insulation',
    'Roofing',
  ];

  const units = ['nos', 'pcs', 'kg', 'ton', 'cum', 'sqm', 'rmt', 'rft'];

  return Array.from({ length: count }, (_, index) => ({
    id: `mat-${index}`,
    name: materials[index % materials.length],
    code: `MAT-${String(index + 1).padStart(4, '0')}`,
    unit: units[index % units.length],
    rate: Math.round(Math.random() * 100000) / 100,
    quantity: Math.round(Math.random() * 1000),
    supplier: `Supplier ${(index % 5) + 1}`,
    status: 'available',
  }));
}

/**
 * Generate mock labour/workers data
 */
export function generateLabourData(count: number = 15) {
  const roles = [
    'Skilled Labour',
    'Semi-Skilled Labour',
    'Unskilled Labour',
    'Supervisor',
    'Foreman',
  ];

  const skills = [
    'Carpentry',
    'Masonry',
    'Plumbing',
    'Electrical',
    'Welding',
    'Excavation',
    'Formwork',
  ];

  return Array.from({ length: count }, (_, index) => ({
    id: `labour-${index}`,
    name: `Worker ${index + 1}`,
    role: roles[index % roles.length],
    dailyRate: Math.round((500 + Math.random() * 2000) * 100) / 100,
    skills: [skills[index % skills.length], skills[(index + 1) % skills.length]],
    certifications: index % 3 === 0 ? ['OSHA', 'First Aid'] : [],
    availability: 'available',
  }));
}

/**
 * Generate mock site/location data
 */
export function generateSiteData(count: number = 10) {
  const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Pune'];
  const states = ['DL', 'MH', 'KA', 'TG', 'MH'];

  return Array.from({ length: count }, (_, index) => ({
    id: `site-${index}`,
    name: `Project ${index + 1}`,
    city: cities[index % cities.length],
    state: states[index % states.length],
    latitude: 28.7041 + (Math.random() - 0.5) * 10,
    longitude: 77.1025 + (Math.random() - 0.5) * 10,
    area: Math.round((1000 + Math.random() * 100000) * 100) / 100,
    areaUnit: index % 2 === 0 ? 'sqm' : 'sqft',
    status: ['Active', 'Completed', 'Planning'][index % 3],
  }));
}

/**
 * Generate mock equipment/asset data
 */
export function generateEquipmentData(count: number = 20) {
  const types = ['Excavator', 'Crane', 'Mixer', 'Pump', 'Compressor', 'Genset', 'JCB', 'Roller'];

  return Array.from({ length: count }, (_, index) => ({
    id: `equip-${index}`,
    assetCode: `EQ-${String(index + 1).padStart(5, '0')}`,
    type: types[index % types.length],
    make: `Brand ${(index % 3) + 1}`,
    model: `Model ${(index % 5) + 1}`,
    purchaseDate: new Date(2020 + Math.floor(index / 10), index % 12, 1),
    rentalRate: Math.round((500 + Math.random() * 5000) * 100) / 100,
    condition: ['Good', 'Fair', 'Needs Repair'][index % 3],
    location: `Yard ${(index % 3) + 1}`,
  }));
}

// ============================================================================
// ASYNC OPERATION GENERATORS
// ============================================================================

/**
 * Create a simulated async operation with configurable delay and error rate
 */
export function createAsyncOperation<T>(
  data: T,
  options?: {
    delay?: number;
    errorRate?: number; // 0-1
    errorMessage?: string;
  },
): Promise<T> {
  const { delay = 1000, errorRate = 0, errorMessage = 'Operation failed' } = options || {};

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < errorRate) {
        reject(new Error(errorMessage));
      } else {
        resolve(data);
      }
    }, delay);
  });
}

/**
 * Create async select options loader
 */
export function createAsyncOptionsLoader<T extends { id: string; name: string }>(
  data: T[],
  options?: {
    delay?: number;
    filterFn?: (item: T, searchTerm: string) => boolean;
    errorRate?: number;
  },
) {
  const { delay = 500, errorRate = 0 } = options || {};
  const defaultFilter = (item: T, term: string) =>
    item.name.toLowerCase().includes(term.toLowerCase());
  const filterFn = options?.filterFn || defaultFilter;

  return (searchTerm: string) =>
    createAsyncOperation(
      data.filter((item) => filterFn(item, searchTerm)),
      { delay, errorRate },
    );
}

/**
 * Create async validation loader (for unique checks, server-side validation, etc.)
 */
export function createAsyncValidator(
  validationFn: (value: string) => boolean,
  options?: {
    delay?: number;
    errorMessage?: string;
  },
) {
  const { delay = 800, errorMessage = 'Validation failed' } = options || {};

  return (value: string) =>
    createAsyncOperation(
      { isValid: validationFn(value), message: '' },
      {
        delay,
        errorRate: 0,
      },
    ).catch(() => ({
      isValid: false,
      message: errorMessage,
    }));
}

// ============================================================================
// ERROR STATE GENERATORS
// ============================================================================

/**
 * Generate a validation error
 */
export function generateValidationError(
  field: string,
  type: 'required' | 'invalid' | 'range' | 'format' | 'custom' = 'required',
  customMessage?: string,
): { field: string; message: string; type: string } {
  const messages = {
    required: `${field} is required`,
    invalid: `${field} is invalid`,
    range: `${field} is out of range`,
    format: `${field} format is incorrect`,
    custom: customMessage || `${field} validation failed`,
  };

  return {
    field,
    message: messages[type],
    type,
  };
}

/**
 * Generate loading state
 */
export function generateLoadingState(message: string = 'Loading...') {
  return {
    isLoading: true,
    message,
    progress: Math.random() * 100,
    startTime: Date.now(),
  };
}

/**
 * Generate error state with recovery options
 */
export function generateErrorState(
  message: string,
  options?: {
    code?: string;
    severity?: 'info' | 'warning' | 'error';
    retryable?: boolean;
    details?: Record<string, any>;
  },
) {
  const { code = 'ERROR', severity = 'error', retryable = true, details = {} } = options || {};

  return {
    isError: true,
    code,
    message,
    severity,
    retryable,
    timestamp: Date.now(),
    details,
  };
}

// ============================================================================
// EDGE CASE VALUE GENERATORS
// ============================================================================

/**
 * Generate edge case numbers
 */
export const edgeCaseNumbers = {
  negative: -999999,
  negativeSmall: -0.01,
  zero: 0,
  verySmall: 0.000001,
  small: 1,
  large: 999999999,
  veryLarge: Number.MAX_SAFE_INTEGER,
  decimal: 123.456789,
  repeating: 1 / 3, // 0.333...
  infinity: Infinity,
  negativeInfinity: -Infinity,
  nan: NaN,
};

/**
 * Generate edge case dates
 */
export const edgeCaseDates = {
  today: new Date(),
  tomorrow: new Date(Date.now() + 24 * 60 * 60 * 1000),
  yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000),
  leapYearDate: new Date('2024-02-29'), // Leap year
  yearBoundary: new Date('2024-12-31'),
  newYear: new Date('2025-01-01'),
  epoch: new Date('1970-01-01'),
  farFuture: new Date('2100-12-31'),
  farPast: new Date('1900-01-01'),
};

/**
 * Generate edge case strings
 */
export const edgeCaseStrings = {
  empty: '',
  singleChar: 'a',
  whitespace: '   ',
  veryLong: 'a'.repeat(10000),
  specialChars: '!@#$%^&*()',
  unicode: '你好世界🚀',
  html: '<script>alert("xss")</script>',
  sql: "'; DROP TABLE users; --",
  regex: '/^[a-z]+$/',
  multiline: 'line1\nline2\nline3',
  tabs: 'col1\tcol2\tcol3',
  nullChar: 'text\x00text',
};

/**
 * Generate edge case file objects (for testing)
 */
export function generateMockFile(
  name: string = 'test.txt',
  size: number = 1024,
  type: string = 'text/plain',
): File {
  const blob = new Blob([new ArrayBuffer(size)], { type });
  return new File([blob], name, { type });
}

/**
 * Generate oversized file mock
 */
export function generateOversizedFileMock(sizeMB: number = 100, name: string = 'large.zip'): File {
  const sizeBytes = sizeMB * 1024 * 1024;
  return generateMockFile(name, sizeBytes, 'application/zip');
}

/**
 * Generate invalid file mocks (wrong type)
 */
export function generateInvalidFileMocks() {
  return {
    textAsImage: generateMockFile('notImage.txt', 100, 'text/plain'),
    exeFile: generateMockFile('virus.exe', 512, 'application/octet-stream'),
    corruptedPDF: generateMockFile('corrupt.pdf', 200, 'application/pdf'),
  };
}

// ============================================================================
// FORM STATE GENERATORS
// ============================================================================

/**
 * Generate pending validation state
 */
export function generatePendingValidationState() {
  return {
    fields: {
      email: { status: 'pending', message: 'Checking availability...' },
      username: { status: 'pending', message: 'Checking availability...' },
    },
  };
}

/**
 * Generate partially filled form state
 */
export function generatePartialFormState(completion: number = 0.5) {
  // completion: 0-1 (0% to 100%)
  return {
    filledFields: Math.round(20 * completion),
    totalFields: 20,
    completion: completion * 100,
    unsavedChanges: true,
  };
}

/**
 * Generate form with all error states
 */
export function generateFormWithErrors(fieldCount: number = 10) {
  const errors = Array.from({ length: fieldCount }, (_, index) => ({
    field: `field${index}`,
    message: `Error in field ${index + 1}`,
    type: 'validation',
  }));

  return { hasErrors: true, errors, errorCount: fieldCount };
}

// ============================================================================
// CONSTRUCTION-SPECIFIC GENERATORS
// ============================================================================

/**
 * Generate Bill of Quantities items
 */
export function generateBoQItems(count: number = 20) {
  const items = [
    { description: 'Excavation', unit: 'cum', rate: 500 },
    { description: 'PCC Base', unit: 'sqm', rate: 400 },
    { description: 'Brick Masonry', unit: 'sqm', rate: 350 },
    { description: 'RCC', unit: 'cum', rate: 6000 },
    { description: 'Steel Reinforcement', unit: 'kg', rate: 60 },
    { description: 'Plaster', unit: 'sqm', rate: 150 },
    { description: 'Flooring', unit: 'sqm', rate: 500 },
    { description: 'Ceiling', unit: 'sqm', rate: 300 },
  ];

  return Array.from({ length: count }, (_, index) => {
    const item = items[index % items.length]!;
    const quantity = Math.round((10 + Math.random() * 100) * 100) / 100;

    return {
      id: `boq-${index}`,
      description: item.description,
      unit: item.unit,
      quantity,
      rate: item.rate,
      amount: quantity * item.rate,
    };
  });
}

/**
 * Generate cost estimation breakdown
 */
export function generateCostEstimation() {
  const labourCost = Math.round(Math.random() * 1000000);
  const materialCost = Math.round(Math.random() * 2000000);
  const equipmentCost = Math.round(Math.random() * 500000);
  const subtotal = labourCost + materialCost + equipmentCost;
  const overhead = Math.round(subtotal * 0.1);
  const contingency = Math.round((subtotal + overhead) * 0.05);

  return {
    labourCost,
    materialCost,
    equipmentCost,
    subtotal,
    overhead,
    overheadPercent: 10,
    contingency,
    contingencyPercent: 5,
    total: subtotal + overhead + contingency,
  };
}

/**
 * Generate material takeoff with unit conversions
 */
export function generateMaterialTakeoff() {
  return {
    items: [
      {
        description: 'Excavation',
        length: 100,
        width: 50,
        depth: 2,
        lengthUnit: 'm',
        widthUnit: 'm',
        depthUnit: 'm',
        volume: 10000,
        volumeUnit: 'cum',
      },
      {
        description: 'Concrete',
        length: 100,
        width: 50,
        depth: 0.3,
        lengthUnit: 'm',
        widthUnit: 'm',
        depthUnit: 'm',
        volume: 1500,
        volumeUnit: 'cum',
      },
    ],
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a delay promise for testing async flows
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format number with unit (for testing)
 */
export function formatNumberWithUnit(value: number, unit: string): string {
  return `${value.toLocaleString('en-IN')} ${unit}`;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Check if value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return !isNaN(value) && value >= min && value <= max;
}

/**
 * Validate file size
 */
export function isFileSizeValid(fileSizeMB: number, maxSizeMB: number): boolean {
  return fileSizeMB <= maxSizeMB;
}

/**
 * Validate file type
 */
export function isFileTypeValid(fileType: string, acceptedTypes: string[]): boolean {
  return acceptedTypes.includes(fileType);
}
