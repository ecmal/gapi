
export type ReadConsistency = "READ_CONSISTENCY_UNSPECIFIED" | "STRONG" | "EVENTUAL";

export interface Entity {
    key: Key;
    properties: MapLike<Value>
}

export interface EntityResult {
    entity: Entity,
    version: string,
    cursor: string,
}
export interface PartitionId {
    projectId?: string,
    namespaceId: string,
}
export interface PathElement {
    kind: string,
    id?: string,
    name?: string,
}
export type Path = PathElement[];
export interface Key {
    partitionId?: PartitionId,
    path: Path,
}
export type Keys = Key[];
export interface ReadOptions {
    readConsistency: ReadConsistency;
    transaction: string;
}

export interface LookupOptions {
    params: LookupParams;
    body: LookupBody;
}
export type EntityResults = EntityResult[];
export interface LookupResult {
    found: EntityResults;
    missing: EntityResults;
    deferred: Keys;
}
export interface LookupParams {
    projectId: string
}
export interface LookupBody {
    readOptions?: ReadOptions,
    keys: Keys,
}


export interface RunQueryOptions {
    params: RunQueryParams;
    body: RunQueryBody;
}
export interface RunQueryParams {
    projectId: string
}
export interface RunQueryResult {
    batch: QueryResultBatch;
    query: Query;
}
export interface RunQueryBody {
    partitionId?: PartitionId;
    readOptions?: ReadOptions;
    query?: Query;
    gqlQuery?: GqlQuery;
}

export interface Query {
    projection?: Projection[],
    kind?: KindExpression[],
    filter?: Filter,
    order?: PropertyOrder[],
    distinctOn?: PropertyReference[],
    startCursor?: string,
    endCursor?: string,
    offset?: number,
    limit?: number
}

export interface GqlQuery {
    queryString: string,
    allowLiterals: boolean,
    namedBindings: MapLike<GqlQueryParameter>,
    positionalBindings: GqlQueryParameter[],
}
export type GqlQueryParameter = {
    value: Value
} | {
        cursor: string
    }
// 
export interface Projection {
    property: PropertyReference
}
export interface KindExpression {
    name: string
}
export interface Filter {
    compositeFilter: CompositeFilter;
    propertyFilter: PropertyFilter;
}
export interface CompositeFilter {
    "op": "OPERATOR_UNSPECIFIED" | "AND",
    "filters": Filter[],
}
export interface PropertyFilter {
    "property": PropertyReference,
    "op": "OPERATOR_UNSPECIFIED" | "LESS_THAN" | "LESS_THAN_OR_EQUAL" | "GREATER_THAN" | "GREATER_THAN_OR_EQUAL" | "EQUAL" | "HAS_ANCESTOR",
    "value": Value
}
export type Value = ValueType & (
    ValueNullType | ValueBooleanType | ValueIntegerType | ValueTimestampType |
    ValueDoubleType | ValueKeyType | ValueStringType | ValueBlobType | ValuePointType |
    ValueEntityType | ValueArrayType
);

export interface ValueType {
    meaning?: number;
    excludeFromIndexes?: boolean;
}
export interface ValueNullType {
    nullValue: null;
}
export interface ValueBooleanType {
    booleanValue: boolean;
}
export interface ValueIntegerType {
    integerValue: string;
}
export interface ValueTimestampType {
    timestampValue: string;
}
export interface ValueDoubleType {
    doubleValue: number;
}
export interface ValueKeyType {
    keyValue: Key;
}
export interface ValueStringType {
    stringValue: string;
}
export interface ValueBlobType {
    blobValue: string;
}
export interface ValuePointType {
    geoPointValue: GepPoint;
}
export interface ValueEntityType {
    entityValue: Entity;
}
export interface ValueArrayType {
    arrayValue: string;
}
export interface ArrayValue {
    values: Value[]
}
export interface GepPoint {
    latitude: number,
    longitude: number,
}
export interface PropertyOrder {
    property: PropertyReference;
    direction: "DIRECTION_UNSPECIFIED" | "ASCENDING" | "DESCENDING";
}
export interface PropertyReference {
    name: string
}
export interface QueryResultBatch {
    "skippedResults": number,
    "skippedCursor": string,
    "entityResultType": ResultType,
    "entityResults": EntityResult[],
    "endCursor": string,
    "moreResults": MoreResultsType,
    "snapshotVersion": string,
}
export type ResultType = "RESULT_TYPE_UNSPECIFIED" | "FULL" | "PROJECTION" | "KEY_ONLY"
export type MoreResultsType = "MORE_RESULTS_TYPE_UNSPECIFIED" | "NOT_FINISHED" | "MORE_RESULTS_AFTER_LIMIT" | "MORE_RESULTS_AFTER_CURSOR" | "NO_MORE_RESULTS"



export interface AllocateIdsOptions {
    params: AllocateIdsParams;
    body: AllocateIdsBody;
}
export interface AllocateIdsParams {
    projectId: string
}
export interface AllocateIdsBody {
    keys: Keys;
}
export interface AllocateIdsResult {
    keys: Keys;
}


export interface BeginTransactionOptions {
    params: BeginTransactionParams;
}
export interface BeginTransactionParams {
    projectId: string
}
export interface BeginTransactionResult {
    transaction: string;
}


export interface CommitOptions {
    params: CommitParams;
    body: CommitBody;
}
export interface CommitParams {
    projectId: string
}
export interface CommitBody {
    mode: "MODE_UNSPECIFIED" | "TRANSACTIONAL" | "NON_TRANSACTIONAL",
    mutations: Mutation[],
    transaction: string,
}
export interface CommitResult {
    "mutationResults": MutationResult[],
    "indexUpdates": number,
}


export interface RollbackOptions {
    params: RollbackParams;
    body: RollbackBody;
}
export interface RollbackParams {
    projectId: string;
}
export interface RollbackBody {
    transaction: string;
}



export interface Mutation {
    insert?: Entity,
    update?: Entity,
    upsert?: Entity,
    delete?: Key,
    baseVersion?: string,
}
export interface MutationResult {
    key: Key,
    version: string,
    conflictDetected: boolean,
}