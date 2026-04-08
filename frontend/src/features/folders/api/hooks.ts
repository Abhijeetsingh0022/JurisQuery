import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { CaseFolder, CaseFolderDetail, CreateFolderDto } from './folders'

export function useFolders() {
  const { fetcher } = useApi()
  return useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const res = await fetcher('/api/folders')
      // Response might be wrapped in an object { folders: [...] } like documents
      return (res.folders || res) as CaseFolder[]
    },
  })
}

export function useFolder(id: string) {
  const { fetcher } = useApi()
  return useQuery({
    queryKey: ['folders', id],
    queryFn: async () => {
      return await fetcher(`/api/folders/${id}`) as CaseFolderDetail
    },
    enabled: !!id,
  })
}

export function useCreateFolder() {
  const { fetcher } = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dto: CreateFolderDto) => {
      return await fetcher('/api/folders', {
        method: 'POST',
        body: JSON.stringify(dto)
      }) as CaseFolder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

export function useUpdateFolder() {
  const { fetcher } = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: Partial<CreateFolderDto> }) => {
      return await fetcher(`/api/folders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto)
      }) as CaseFolder
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folders', variables.id] })
    },
  })
}

export function useDeleteFolder() {
  const { fetcher } = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fetcher(`/api/folders/${id}`, {
        method: 'DELETE'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

export function useAddDocumentToFolder() {
  const { fetcher } = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ folderId, documentId }: { folderId: string; documentId: string }) => {
      await fetcher(`/api/folders/${folderId}/documents`, {
        method: 'POST',
        body: JSON.stringify({ document_id: documentId })
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders', variables.folderId] })
    },
  })
}

export function useRemoveDocumentFromFolder() {
  const { fetcher } = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ folderId, documentId }: { folderId: string; documentId: string }) => {
      await fetcher(`/api/folders/${folderId}/documents/${documentId}`, {
        method: 'DELETE'
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders', variables.folderId] })
    },
  })
}
