export interface SlideContent {
  content: string;
  bgColor: string;
  textColor: string;
  bgImage?: string | null;
}

export interface Slide {
  id: string;
  pageNumber: number;
  master1: SlideContent;
  master2: SlideContent;
}

export interface Project {
  id: string;
  name: string;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
  zipBase64?: string;
}

export interface RecordingItem {
  id: string;
  title: string;
  duration: number; // in seconds
  videoUrl: string; // data URL or Blob URL or Neon Storage URL
  createdAt: string;
}

export interface ImageSearchResult {
  id: string;
  url: string;
  thumb: string;
  title: string;
  author?: string;
}
