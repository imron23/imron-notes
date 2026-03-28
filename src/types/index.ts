export interface DocumentMeta {
  id: string;
  title: string;
  icon?: string;
  coverImage?: string;
  parentId: string | null;
  children?: DocumentMeta[];
  isShared?: boolean;
}

export interface Document {
  id: string;
  title: string;
  icon?: string;
  coverImage?: string;
  content: any; // BlockNote content JSON
  createdAt: string;
  updatedAt: string;
}
