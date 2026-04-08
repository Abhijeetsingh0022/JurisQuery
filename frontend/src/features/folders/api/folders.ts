export interface CaseFolder {
  id: string
  name: string
  description?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface CaseFolderDetail extends CaseFolder {
  documents: any[]
}

export interface CreateFolderDto {
  name: string
  description?: string
}
