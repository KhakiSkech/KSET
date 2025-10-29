/**
 * DART (Financial Supervisory Service Electronic Disclosure) Integration
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 금융감독원 전자공시 DART 통합 모듈
 */

import {
  CompanyInfo,
  FinancialData,
  Disclosure,
  ApiResponse,
  PaginationOptions
} from '@/interfaces';

import {
  DisclosureType,
  FinancialPeriod,
  ResearchType
} from '@/types';

import {
  KSETError,
  KSETErrorFactory,
  ERROR_CODES,
  Logger,
  ConsoleLogger
} from '@/errors';

/**
 * DART 공시 타입
 */
export enum DARTDisclosureType {
  ANNUAL_REPORT = 'A001',           // 사업보고서
  QUARTERLY_REPORT = 'A002',         // 반기보고서
  QUARTERLY_REPORT_Q1 = 'A003',      // 1분기보고서
  QUARTERLY_REPORT_Q3 = 'A004',      // 3분기보고서
  HALF_YEARLY_REPORT = 'A005',       // 반기보고서 (구)
  AUDIT_REPORT = 'A006',             // 감사보고서
  STOCK_ISSUANCE = 'B001',           // 주식발행결정
  STOCK_ISSUANCE_CHANGE = 'B002',    // 주식발행변경
  MERGER_ACQUISITION = 'C001',        // 합병 등
  DIVIDEND_POLICY = 'D001',          // 배당政策
  DIVIDEND_DECISION = 'D002',         // 배당결정
  SHAREHOLDER_MEETING = 'E001',      // 주주총회 소집
  DIRECTOR_CHANGE = 'F001',          // 이사 등 선임 변경
  INSIDER_TRADING = 'G001',          // 임원ㆍ주주 등 단기매매변동
  BUSINESS_REPORT = 'H001',          // 사업보고
  RESTRUCTURE_PLAN = 'I001',         // 사업구조조정계획
  INVESTMENT_WARNING = 'J001',       // 투자주의환기
  LISTING_DELISTING = 'K001',        // 상장폐지 등
  FINANCIAL_FORECAST = 'L001',       // 실적예측
  MATERIAL_INFORMATION = 'M001',     // 경영권 등 변동사유
  OTHER = 'Z999'                     // 기타
}

/**
 * DART 검색 파라미터
 */
export interface DARTSearchParams {
  corporationCode?: string;         // 고유번호 (종목코드 아님)
  startDate?: string;               // 시작일 (YYYYMMDD)
  endDate?: string;                 // 종료일 (YYYYMMDD)
  disclosureTypes?: DARTDisclosureType[];  // 공시 유형
  lastReportAt?: string;            // 최종보고일 (YYYYMMDD)
  keyword?: string;                 // 검색 키워드
  category?: string;                // 카테고리
}

/**
 * DART 상세 공시 정보
 */
export interface DARTDisclosureDetail extends Disclosure {
  corporationCode: string;          // 고유번호
  corporationName: string;          // 법인명
  stockCode?: string;               // 종목코드
  stockName?: string;               // 종목명
  reportName: string;               // 보고서명
  receiptNo: string;                // 접수번호
  receiptDate: string;              // 접수일자
  flrNo?: string;                   // 외부감사사원번호
  rmsNo?: string;                   // 제출검토번호
  email?: string;                   // 공시 담당자 이메일
  contact?: string;                 // 연락처
  isuCd?: string;                   // 증권종목코드
  issuCnt?: number;                 // 증권종목수
  isuAbbrv?: string;                // 증권종목약명
  isuAbrtCnt?: number;              // 증권종목약명수
  dcmNo?: string;                   // 공시일련번호
  docUrl?: string;                  // 문서 URL
  docInfo?: string;                 // 문서 정보
  attachDocInfo?: Array<{
    seq: number;                     // 순번
    title: string;                   // 첨부문서명
    url: string;                     // 첨부문서 URL
    fileSize: number;                // 파일 크기
  }>;
}

/**
 * DART 재무 정보
 */
export interface DARTFinancialData extends FinancialData {
  corporationCode: string;          // 고유번호
  fsDiv?: string;                   // 재무제표 구분 (CFS: 연결, OFS: 별도)
  sjDiv?: string;                   // 개리구분 (AS: 대차, IS: 중분)
  sjNm?: string;                    // 계정명
  accountNm?: string;               // 과목명
  thstrmNm?: string;                 // 당기명칭
  frmtrmNm?: string;                // 전기명칭
  currency?: string;                // 통화 단위
  ordCmp?: string;                  // 비교 대상
  sjDivNm?: string;                 // 개리구분명
  frmtrmAmount?: number;            // 전기 금액
  thstrmAmount?: number;            // 당기 금액
  frmtrmAddAmount?: number;         // 전기 증감
  thstrmAddAmount?: number;         // 당기 증감
  frmtrmRat?: number;               // 전기비율
  thstrmRat?: number;               // 당기비율
  ordCmpRat?: number;               // 비교대상비율
  unit?: string;                    // 단위 (원, 천원, 백만원 등)
  weight?: number;                  // 가중치
}

/**
 * DART API 응답
 */
interface DARTResponse {
  status: string;                    // 응답 상태
  message: string;                   // 응답 메시지
  errorCode?: string;                // 오류 코드
  errorMessage?: string;             // 오류 메시지
}

/**
 * DART 검색 응답
 */
interface DARTSearchResponse extends DARTResponse {
  list?: Array<{
    corp_code: string;              // 고유번호
    corp_name: string;              // 법인명
    stock_code: string;             // 종목코드
    stock_name: string;             // 종목명
    report_name: string;            // 보고서명
    rcept_no: string;               // 접수번호
    flr_nm: string;                 // 외부감사사원명
    rcept_dt: string;               // 접수일자
    rm: string;                     // 공시 구분 (유가/무료)
  }>;
}

/**
 * DART 상세 응답
 */
interface DARTDetailResponse extends DARTResponse {
  corp_code: string;                // 고유번호
  corp_name: string;                // 법인명
  corp_cls?: string;                // 법인구분 (Y: 유가, K: 코넥, E: 기타)
  corp_cls_name?: string;           // 법인구분명
  stock_code: string;               // 종목코드
  stock_name: string;               // 종목명
  ceo_nm?: string;                  // 대표자명
  corp_cls?: string;                // 법인구분
  jurir_no?: string;                // 사업자등록번호
  bizr_no?: string;                 // 사업자등록번호
  adres?: string;                   // 주소
  hm_url?: string;                  // 홈페이지 URL
  ir_url?: string;                  // IR홈페이지 URL
  phn_no?: string;                  // 전화번호
  fax_no?: string;                  // 팩스번호
  induty_code?: string;             // 업종코드
  induty?: string;                  // 업종
  est_dt?: string;                  // 설립일
  acc_mt?: number;                  // 결산월
};

/**
 * DART 통합 모듈
 */
export class DARTIntegration {
  private apiKey?: string;
  private baseUrl = 'https://opendart.fss.or.kr/api';
  private logger: Logger;
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private cacheTtl = 300000; // 5분 캐시

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.logger = new ConsoleLogger('dart-integration');
  }

  // ==========================================================================
  // CORE API METHODS
  // ==========================================================================

  /**
   * DART API 호출
   */
  private async callDARTAPI(
    endpoint: string,
    params: Record<string, string>
  ): Promise<any> {
    if (!this.apiKey) {
      throw KSETErrorFactory.create(
        ERROR_CODES.AUTHENTICATION_FAILED,
        'DART API key is required',
        'dart-integration'
      );
    }

    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Cache hit for DART API: ${endpoint}`);
      return cached.data;
    }

    try {
      const url = new URL(`${this.baseUrl}/${endpoint}`);
      url.searchParams.set('crtfc_key', this.apiKey);

      for (const [key, value] of Object.entries(params)) {
        if (value) {
          url.searchParams.set(key, value);
        }
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || 'Unknown error'}`);
      }

      // 캐시 저장
      this.cache.set(cacheKey, {
        data,
        expiresAt: Date.now() + this.cacheTtl
      });

      this.logger.debug(`DART API call successful: ${endpoint}`);
      return data;

    } catch (error) {
      this.logger.error(`DART API call failed: ${endpoint}`, error);
      throw KSETErrorFactory.create(
        ERROR_CODES.NETWORK_ERROR,
        `DART API error: ${error.message}`,
        'dart-integration'
      );
    }
  }

  // ==========================================================================
  // CORPORATION SEARCH
  // ==========================================================================

  /**
   * 법인명으로 고유번호 검색
   */
  async searchCorporationByName(
    corpName: string,
    exactMatch: boolean = false
  ): Promise<Array<{
    corp_code: string;
    corp_name: string;
    stock_code: string;
    stock_name: string;
    corp_cls: string;
    corp_cls_name: string;
    jurir_no: string;
    bizr_no: string;
    adres: string;
  }>> {
    const params: Record<string, string> = {
      corp_name: corpName,
      exact_match: exactMatch ? 'true' : 'false'
    };

    const response = await this.callDARTAPI('company.json', params);

    if (response.status !== '000') {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_RESPONSE,
        `DART corporation search failed: ${response.message}`,
        'dart-integration'
      );
    }

    return response.list || [];
  }

  /**
   * 고유번호로 상세 법인 정보 조회
   */
  async getCorporationDetail(
    corporationCode: string
  ): Promise<DARTDetailResponse> {
    const params = {
      corp_code: corporationCode
    };

    const response = await this.callDARTAPI('company.json', params);

    if (response.status !== '000') {
      throw KSETErrorFactory.create(
        ERROR_CODES.NOT_FOUND,
        `Corporation not found: ${corporationCode}`,
        'dart-integration'
      );
    }

    return response;
  }

  /**
   * 종목코드로 법인 정보 검색
   */
  async searchCorporationByStockCode(stockCode: string): Promise<Array<{
    corp_code: string;
    corp_name: string;
    stock_code: string;
    stock_name: string;
    corp_cls: string;
    corp_cls_name: string;
  }>> {
    const params = {
      stock_code: stockCode
    };

    const response = await this.callDARTAPI('stockCode.json', params);

    if (response.status !== '000') {
      throw KSETErrorFactory.create(
        ERROR_CODES.NOT_FOUND,
        `Stock code not found: ${stockCode}`,
        'dart-integration'
      );
    }

    return response.list || [];
  }

  // ==========================================================================
  // DISCLOSURE SEARCH
  // ==========================================================================

  /**
   * 공시 검색
   */
  async searchDisclosures(params: DARTSearchParams): Promise<DARTDisclosureDetail[]> {
    const apiParams: Record<string, string> = {};

    if (params.corporationCode) {
      apiParams.corp_code = params.corporationCode;
    }

    if (params.startDate) {
      apiParams.bgn_de = params.startDate;
    }

    if (params.endDate) {
      apiParams.end_de = params.endDate;
    }

    if (params.lastReportAt) {
      apiParams.last_reprt_de = params.lastReportAt;
    }

    if (params.keyword) {
      apiParams.keyword = params.keyword;
    }

    if (params.category) {
      apiParams.pblntf_detail_ty = params.category;
    }

    if (params.disclosureTypes && params.disclosureTypes.length > 0) {
      apiParams.pblntf_ty = params.disclosureTypes.join(',');
    }

    // 기본값: 최근 3개월
    if (!params.startDate) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      apiParams.bgn_de = this.formatDate(threeMonthsAgo);
    }

    if (!params.endDate) {
      apiParams.end_de = this.formatDate(new Date());
    }

    const response = await this.callDARTAPI('list.json', apiParams);

    if (response.status !== '000') {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_RESPONSE,
        `DART disclosure search failed: ${response.message}`,
        'dart-integration'
      );
    }

    // 검색 결과를 상세 정보로 변환
    const disclosures: DARTDisclosureDetail[] = [];

    for (const item of response.list || []) {
      disclosures.push({
        id: item.rcept_no,
        title: item.report_name,
        type: this.mapDisclosureType(item.rcept_no),
        publishDate: item.rcept_dt,
        corporationId: item.corp_code,
        corporationName: item.corp_name,
        stockCode: item.stock_code,
        stockName: item.stock_name,
        reportName: item.report_name,
        receiptNo: item.rcept_no,
        receiptDate: item.rcept_dt,
        url: `${this.baseUrl}/dsaf001/main.do?rcpNo=${item.rcept_no}`,
        isPaid: item.rm === 'Y',
        attachments: [], // 첨부파일 정보는 상세 조회 필요
        summary: '',
        source: 'dart',
        rawData: item
      });
    }

    return disclosures;
  }

  /**
   * 공시 상세 정보 조회
   */
  async getDisclosureDetail(receiptNo: string): Promise<DARTDisclosureDetail> {
    const params = {
      rcept_no: receiptNo
    };

    const response = await this.callDARTAPI('detail.json', params);

    if (response.status !== '000') {
      throw KSETErrorFactory.create(
        ERROR_CODES.NOT_FOUND,
        `Disclosure not found: ${receiptNo}`,
        'dart-integration'
      );
    }

    // 첨부파일 정보 조회
    const attachParams = {
      rcept_no: receiptNo
    };

    const attachResponse = await this.callDARTAPI('attach.json', attachParams);
    const attachments = attachResponse.list || [];

    const disclosure: DARTDisclosureDetail = {
      id: receiptNo,
      title: response.report_name || '',
      type: this.mapDisclosureType(receiptNo),
      publishDate: response.rcept_dt || '',
      corporationId: response.corp_code || '',
      corporationName: response.corp_name || '',
      stockCode: response.stock_code || '',
      stockName: response.stock_name || '',
      reportName: response.report_name || '',
      receiptNo: receiptNo,
      receiptDate: response.rcept_dt || '',
      url: `${this.baseUrl}/dsaf001/main.do?rcpNo=${receiptNo}`,
      isPaid: response.rm === 'Y',
      attachments: attachments.map((att: any) => ({
        seq: att.seq,
        title: att.title,
        url: att.url,
        fileSize: att.file_size || 0
      })),
      summary: this.extractSummary(response),
      source: 'dart',
      rawData: response
    };

    return disclosure;
  }

  // ==========================================================================
  // FINANCIAL DATA
  // ==========================================================================

  /**
   * 재무 정보 조회
   */
  async getFinancialData(
    corporationCode: string,
    year: number,
    quarter: number = 4,
    fsDiv: 'CFS' | 'OFS' = 'CFS',
    sjDiv: 'AS' | 'IS' = 'IS'
  ): Promise<DARTFinancialData[]> {
    const bsnsYear = year.toString();
    const reprtCode = quarter === 4 ? '11011' : quarter === 3 ? '11013' : quarter === 2 ? '11012' : '11014';

    const params = {
      corp_code: corporationCode,
      bsns_year: bsnsYear,
      reprt_code: reprtCode,
      fs_div: fsDiv,
      sj_div: sjDiv
    };

    const response = await this.callDARTAPI('fnlttSinglAcntAll.json', params);

    if (response.status !== '000') {
      throw KSETErrorFactory.create(
        ERROR_CODES.NOT_FOUND,
        `Financial data not found: ${corporationCode} ${year}-${quarter}`,
        'dart-integration'
      );
    }

    const financialData: DARTFinancialData[] = [];

    for (const item of response.list || []) {
      financialData.push({
        symbol: '', // DART 데이터에는 종목 코드 없음
        year,
        quarter,
        period: this.mapQuarterToPeriod(quarter),
        revenue: this.parseAmount(item.thstrm_amount),
        operatingIncome: 0, // TODO: 계정명 기반으로 매핑
        netIncome: 0,
        grossProfit: 0,
        ebitda: 0,
        eps: 0,
        bps: 0,
        roe: 0,
        roa: 0,
        debtRatio: 0,
        currentRatio: 0,
        quickRatio: 0,
        priceToSales: 0,
        priceToBook: 0,
        priceToEarnings: 0,
        dividendYield: 0,
        corporationCode,
        fsDiv,
        sjDiv,
        sjNm: item.sj_nm,
        accountNm: item.account_nm,
        thstrmNm: item.thstrm_nm,
        frmtrmNm: item.frmtrm_nm,
        currency: item.currency || 'KRW',
        ordCmp: item.ord_cmp,
        sjDivNm: item.sj_div_nm,
        frmtrmAmount: this.parseAmount(item.frmtrm_amount),
        thstrmAmount: this.parseAmount(item.thstrm_amount),
        frmtrmAddAmount: this.parseAmount(item.frmtrm_add_amount),
        thstrmAddAmount: this.parseAmount(item.thstrm_add_amount),
        frmtrmRat: this.parseAmount(item.frmtrm_rat),
        thstrmRat: this.parseAmount(item.thstrm_rat),
        ordCmpRat: this.parseAmount(item.ord_cmp_rat),
        unit: item.unit,
        weight: 0,
        source: 'dart',
        rawData: item
      });
    }

    return financialData;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * 날짜 포맷팅 (YYYYMMDD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * 공시 타입 매핑
   */
  private mapDisclosureType(receiptNo: string): DisclosureType {
    const prefix = receiptNo.substring(0, 4);

    switch (prefix) {
      case 'A001':
        return DisclosureType.ANNUAL_REPORT;
      case 'A002':
      case 'A003':
      case 'A004':
      case 'A005':
        return DisclosureType.QUARTERLY_REPORT;
      case 'D001':
      case 'D002':
        return DisclosureType.DIVIDEND;
      case 'G001':
        return DisclosureType.INSIDER_TRADING;
      case 'J001':
        return DisclosureType.INVESTMENT_WARNING;
      default:
        return DisclosureType.OTHER;
    }
  }

  /**
   * 분기를 기간으로 매핑
   */
  private mapQuarterToPeriod(quarter: number): FinancialPeriod {
    switch (quarter) {
      case 1:
        return FinancialPeriod.Q1;
      case 2:
        return FinancialPeriod.Q2;
      case 3:
        return FinancialPeriod.Q3;
      case 4:
        return FinancialPeriod.ANNUAL;
      default:
        return FinancialPeriod.ANNUAL;
    }
  }

  /**
   * 금액 파싱
   */
  private parseAmount(amount: string | number | undefined): number {
    if (!amount) return 0;

    const strAmount = String(amount).replace(/,/g, '');
    const parsed = parseFloat(strAmount);

    if (isNaN(parsed)) return 0;
    return parsed;
  }

  /**
   * 요약 정보 추출
   */
  private extractSummary(response: any): string {
    // DART 상세 응답에서 요약 정보 추출
    // 실제 구현에서는 텍스트 분석 로직 추가
    return `${response.corp_name || ''} 공시 문서`;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * API 키 설정
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.logger.info('DART API key configured');
  }

  /**
   * 캐시 정리
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('DART cache cleared');
  }

  /**
   * 캐시 통계
   */
  getCacheStats(): {
    size: number;
    hitRate?: number;
    memoryUsage?: number;
  } {
    return {
      size: this.cache.size
    };
  }

  /**
   * 지원되는 공시 타입 목록
   */
  getSupportedDisclosureTypes(): Array<{
    type: DARTDisclosureType;
    name: string;
    description: string;
  }> {
    return [
      {
        type: DARTDisclosureType.ANNUAL_REPORT,
        name: '사업보고서',
        description: '연간 재무제표 및 경영실적 공시'
      },
      {
        type: DARTDisclosureType.QUARTERLY_REPORT,
        name: '분기보고서',
        description: '분기별 재무제표 및 경영실적 공시'
      },
      {
        type: DARTDisclosureType.DIVIDEND_DECISION,
        name: '배당결정',
        description: '주식배당에 대한 결정 사항 공시'
      },
      {
        type: DARTDisclosureType.INSIDER_TRADING,
        name: '임원·주주 등 단기매매변동',
        description: '내부자 단기매매 내역 공시'
      },
      {
        type: DARTDisclosureType.INVESTMENT_WARNING,
        name: '투자주의환기',
        description: '투자 주의를 요하는 정보 공시'
      }
    ];
  }
}