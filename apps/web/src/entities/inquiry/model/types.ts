export interface InquiryItem {
  qnaNo: number;
  itemCode: string;
  itemTitle: string;
  question: string;
  answer: string;
  isAnswered: boolean;
  questionDate: string;
  answerDate: string;
  buyerNick: string;
}

export interface InquiryListResult {
  items: InquiryItem[];
  totalCount: number;
}

export type InquiryFilter = 'ALL' | 'Y' | 'N';
