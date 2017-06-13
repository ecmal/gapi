export interface ProjectReference {
    projectId: string;
}
export interface Project {
    kind?: "bigquery#project",
    id?: string,
    numericId?: number,
    projectReference?: ProjectReference,
    friendlyName?: string
}
export interface DatasetReference extends ProjectReference {
    datasetId: string;
}
export interface Dataset {
    kind?: "bigquery#dataset",
    etag?: string,
    id?: string,
    selfLink?: string,
    datasetReference: DatasetReference,
    friendlyName?: string,
    description?: string,
    defaultTableExpirationMs?: number,
    labels?: Dictionary<string>,
    access?: DatasetAccess[],
    creationTime?: number,
    lastModifiedTime?: number,
    location?: string
}
export interface DatasetAccess {
    role: string,
    userByEmail: string,
    groupByEmail: string,
    domain: string,
    specialGroup: string,
    view: TableReference
}
export interface JobReference {
    projectId: string,
    jobId: string
}
export interface Job {
    kind?: "bigquery#job",
    etag?: string,
    id?: string,
    selfLink?: string,
    user_email?: string;
    jobReference?: JobReference,
    configuration?: JobConfiguration,
    status?: JobStatus,
    statistics?: JobStatistics
}
export interface JobConfiguration {
    dryRun?: boolean,
    labels?: Dictionary<string>
    query?: QueryJobConfiguration,
    load?: LoadJobConfiguration,
    copy?: CopyJobConfiguration,
    extract?: ExtractJobConfiguration
}
export interface QueryJobConfiguration {
    query: string,
    destinationTable: TableReference,
    createDisposition: string,
    writeDisposition: WriteDisposition,
    priority: string,
    preserveNulls: boolean,
    allowLargeResults: boolean,
    useQueryCache: boolean,
    flattenResults: boolean,
    maximumBillingTier: number,
    maximumBytesBilled: number,
    useLegacySql: boolean,
    parameterMode: string,
    defaultDataset: DatasetReference,
    tableDefinitions: Dictionary<TableDefinition>,
    userDefinedFunctionResources: FunctionResource[],
    queryParameters: QueryParameter[],
    schemaUpdateOptions: SchemaUpdateOption[]
}

export interface CsvOptions {
    fieldDelimiter: string,
    skipLeadingRows: number,
    quote: string,
    allowQuotedNewlines: boolean,
    allowJaggedRows: boolean,
    encoding: string
}
export interface BigtableOptions {
    columnFamilies: {
        familyId: string,
        type: string,
        encoding: string,
        onlyReadLatest: boolean;
        columns: {
            qualifierEncoded: string,
            qualifierString: string,
            fieldName: string,
            type: string,
            encoding: string,
            onlyReadLatest: boolean
        }[]
    }[],
    ignoreUnspecifiedColumnFamilies: boolean,
    readRowkeyAsString: boolean
}
export interface GoogleSheetsOptions {
    skipLeadingRows: number
}
export interface LoadJobConfiguration {
    sourceUris?: string[],
    schema?: TableSchema,
    destinationTable?: TableReference,
    createDisposition?: CreateDisposition,
    writeDisposition?: WriteDisposition,
    nullMarker?: string,
    fieldDelimiter?: string,
    skipLeadingRows?: number,
    encoding?: Encoding,
    quote?: string,
    maxBadRecords?: number,
    schemaInlineFormat?: string,
    schemaInline?: string,
    allowQuotedNewlines?: boolean,
    sourceFormat?: SourceFormat,
    allowJaggedRows?: boolean,
    ignoreUnknownValues?: boolean,
    projectionFields?: string[],
    autodetect?: boolean,
    schemaUpdateOptions?: SchemaUpdateOption[]
}
export type Encoding = "UTF-8"|"ISO-8859-1";
export type SourceFormat = "CSV" | "DATASTORE_BACKUP" | "NEWLINE_DELIMITED_JSON" | "AVRO";
export type WriteDisposition = "WRITE_TRUNCATE" | "WRITE_APPEND" | "WRITE_EMPTY";
export type SchemaUpdateOption = "ALLOW_FIELD_ADDITION" | "ALLOW_FIELD_RELAXATION";
export type CreateDisposition = "CREATE_IF_NEEDED" | "CREATE_NEVER";

export interface CopyJobConfiguration {
    sourceTable?: TableReference,
    sourceTables?: TableReference[],
    destinationTable: TableReference,
    createDisposition?: CreateDisposition,
    writeDisposition?: WriteDisposition;
}
export interface ExtractJobConfiguration {
    sourceTable: TableReference,
    destinationUri: string,
    destinationUris: string[],
    printHeader: boolean,
    fieldDelimiter: string,
    destinationFormat: string,
    compression: string
}
export interface JobStatus {
    state: "PENDING"|"RUNNING"|"DONE",
    errorResult: BigQueryError,
    errors: BigQueryError[]
}
export interface BigQueryError {
    reason: string,
    location: string,
    debugInfo: string,
    message: string
}
export interface JobStatistics {
    creationTime: number,
    startTime: number,
    endTime: number,
    totalBytesProcessed: number,
    query: {
        queryPlan: {
            name: string,
            id: number,
            waitRatioAvg: number,
            waitRatioMax: number,
            readRatioAvg: number,
            readRatioMax: number,
            computeRatioAvg: number,
            computeRatioMax: number,
            writeRatioAvg: number,
            writeRatioMax: number,
            recordsRead: number,
            recordsWritten: number,
            status: string,
            steps: {
                kind: string,
                substeps: string[]
            }[]
        }[],
        totalBytesProcessed: number,
        totalBytesBilled: number,
        billingTier: number,
        cacheHit: boolean,
        referencedTables: TableReference[],
        schema: TableSchema,
        numDmlAffectedRows: number,
        undeclaredQueryParameters: QueryParameter[],
        statementType: string
    },
    load: {
        inputFiles: number,
        inputFileBytes: number,
        outputRows: number,
        outputBytes: number
    },
    extract: {
        destinationUriFileCounts: number[]
    }
}

export interface TableReference extends DatasetReference {
    tableId: string
}
export interface Table {
    kind?: "bigquery#table",
    etag?: string,
    id?: string,
    selfLink?: string,
    friendlyName?: string,
    description?: string,
    numBytes?: number,
    numLongTermBytes?: number,
    numRows?: number,
    creationTime?: number,
    expirationTime?: number,
    lastModifiedTime?: number,
    type?: string,
    location?: string,
    tableReference?: TableReference,
    labels?: Dictionary<string>,
    schema?: TableSchema,
    view?: TableView,
    timePartitioning?: TimePartitioning,
    externalDataConfiguration?: TableDefinition,
    streamingBuffer?: StreamingBuffer
}
export interface TimePartitioning {
    type: "DAY",
    expirationMs: number
}
export interface StreamingBuffer {
    estimatedRows: number,
    estimatedBytes: number,
    oldestEntryTime: number
}
export interface TableView {
    query: string,
    userDefinedFunctionResources: FunctionResource[],
    useLegacySql: boolean
}
export interface TableDefinition {
    sourceUris: string[],
    schema: TableSchema,
    sourceFormat: string,
    maxBadRecords: number,
    autodetect: boolean,
    ignoreUnknownValues: boolean,
    compression: string,
    csvOptions: CsvOptions,
    bigtableOptions: BigtableOptions,
    googleSheetsOptions: GoogleSheetsOptions
}
export interface TableSchema {
    fields: TableField[]
}

export interface TableField {
    name: string,
    type: "STRING" | "BYTES" | "INTEGER" | "FLOAT" | "BOOLEAN" | "TIMESTAMP" | "DATE" | "TIME" | "DATETIME" | "RECORD",
    mode: "NULLABLE" | "REQUIRED" | "REPEATED",
    fields?: TableFieldSchema[],
    description?: string
}
export interface TableFieldSchema { }

export interface FunctionResource {
    resourceUri: string,
    inlineCode: string
}
export interface ParameterType {
    type: string,
    arrayType: QueryParameterType,
    structTypes: {
        name: string,
        type: QueryParameterType,
        description: string
    }[]
}
export interface ParameterValue {
    value: string,
    arrayValues: QueryParameterValue[],
    structValues: Dictionary<QueryParameterValue>
}

export interface QueryParameter {
    name: string,
    parameterType: ParameterType,
    parameterValue: ParameterValue
}
export interface QueryParameterType { }
export interface QueryParameterValue { }
// operations 
export interface GetDatasetOptions {
    params: DatasetReference
}
export interface DeleteDatasetOptions {
    params: DatasetReference
    query?: {
        deleteContents?: boolean
    }
}
export interface InsertDatasetOptions {
    params: ProjectReference
    body: Dataset
}
export interface UpdateDatasetOptions {
    params: DatasetReference;
    body: Dataset
}
export interface GetDatasetsOptions {
    params: ProjectReference
    query?: {
        all?: boolean;
        filter?: string;
        maxResults?: number
        pageToken?: string
    }
}
export interface GetDatasetsResult {
    kind: "bigquery#datasetList",
    etag: string,
    nextPageToken: string,
    datasets: Dataset[]
}
export interface GetJobOptions {
    params: JobReference;
}
export interface InsertJobOptions {
    params: ProjectReference;
    body?: Job;
    media?: any;
    query?: {
        uploadType?: "multipart" | "resumable",
    }
}
export interface GetJobsOptions {
    params: ProjectReference;
    query?: {
        allUsers?: boolean;
        projection?: "full" | "minimal"
        stateFilter?: "done" | "pending" | "running"
        maxResults?: number
        pageToken?: string
    }
}
export interface GetJobsResult {
    kind: "bigquery#datasetList",
    etag: string,
    nextPageToken: string,
    jobs: Job[]
}


export interface GetProjectsOptions {
    query?: {
        maxResults: number
        pageToken: string
    }
}
export interface GetProjectsResult {
    kind: "bigquery#projectList",
    etag: string,
    nextPageToken: string,
    projects: Project[],
    totalItems: number
}

export interface GetTableOptions {
    params: TableReference;
    query?: {
        selectedFields: string
    }
}
export interface InsertTableOptions {
    params: DatasetReference;
    body: Table
}
export interface UpdateTableOptions {
    params: TableReference;
}
export interface DeleteTableOptions {
    params: TableReference;
}
export interface GetTablesOptions {
    params: DatasetReference;
    query?: {
        maxResults: number
        pageToken: string
    }
}

export interface GetTablesResult {
    kind: "bigquery#tableList",
    etag: string,
    nextPageToken: string,
    totalItems: number
    tables: Table[]
}

export interface GetRowsOptions {
    params: TableReference;
    query?: {
        maxResults: number
        pageToken: string
        selectedFields: string;
        startIndex: number;
    }
}
export interface GetRowsResult {
    kind: "bigquery#tableDataList",
    etag: string,
    totalRows: number,
    pageToken: string,
    rows: { f: { v: any }[] }[]
}
export interface InsertRowsOptions {
    params: TableReference;
    body: InsertRowsBody;
}
export interface InsertRowsBody {
    kind: "bigquery#tableDataInsertAllRequest",
    skipInvalidRows: boolean,
    ignoreUnknownValues: boolean,
    templateSuffix: string,
    rows: { insertId: string, json: Dictionary<any> }[]
}
export interface InsertRowsResult {
    kind: "bigquery#tableDataInsertAllResponse",
    insertErrors: InsertRowError[]
}
export interface InsertRowError {
    index: number,
    errors: BigQueryError[]
}