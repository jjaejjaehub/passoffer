export type { InquiryItem, InquiryListResult, InquiryFilter } from './model/types';
export {
  inquiryQueries,
  useQoo10Inquiries,
} from './api/inquiryQueries';
export type { InquiryQueryParams, InquiryQueryResult } from './api/inquiryQueries';
export { useQoo10ReplyInquiry } from './api/inquiryMutations';
