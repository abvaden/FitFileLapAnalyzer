declare module 'fit-file-parser' {
  interface FitParserOptions {
    force?: boolean;
    speedUnit?: string;
    lengthUnit?: string;
    temperatureUnit?: string;
    pressureUnit?: string;
    elapsedRecordField?: boolean;
    mode?: string;
  }

  interface FitParserCallback {
    (error: any, data: any): void;
  }

  class FitParser {
    constructor(options?: FitParserOptions);
    parse(buffer: ArrayBuffer, callback: FitParserCallback): void;
  }

  export default FitParser;
}
