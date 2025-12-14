/**
 * URL 유틸리티 함수들
 * URL 비교, 정규화, 파싱 등의 기능 제공
 */
/**
 * URL 정규화
 * - 트레일링 슬래시 제거
 * - 해시(fragment) 제거
 * - 쿼리 파라미터 정렬
 */
export declare function normalizeUrl(url: string): string;
/**
 * 두 URL이 같은 페이지를 가리키는지 확인
 * (해시와 쿼리 파라미터 순서 무시)
 */
export declare function isSameUrl(url1: string, url2: string): boolean;
/**
 * 두 URL의 origin이 같은지 확인
 */
export declare function isSameOrigin(url1: string, url2: string): boolean;
/**
 * 상대 URL을 절대 URL로 변환
 */
export declare function resolveUrl(relativeUrl: string, baseUrl: string): string;
/**
 * URL에서 도메인 추출
 */
export declare function getDomain(url: string): string;
/**
 * URL에서 경로 추출
 */
export declare function getPath(url: string): string;
/**
 * URL에서 쿼리 파라미터 추출
 */
export declare function getQueryParams(url: string): Record<string, string>;
/**
 * URL이 유효한지 검증
 */
export declare function isValidUrl(url: string): boolean;
/**
 * HTTP/HTTPS URL인지 확인
 */
export declare function isHttpUrl(url: string): boolean;
/**
 * URL이 현재 페이지와 같은 페이지인지 확인
 * (해시만 다른 경우 같은 페이지로 간주)
 */
export declare function isSamePage(url1: string, url2: string): boolean;
