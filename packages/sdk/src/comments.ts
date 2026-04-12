import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Comment, NewCommentInput } from './types.js'
import { warn, log } from './debug.js'

/**
 * CRUD + real-time subscription surface for comments.
 * Everything is scoped by (site_id, page_path) so host apps with multiple
 * routes get isolated comment threads per page.
 */
export class CommentsStore {
  constructor(private readonly client: SupabaseClient) {}

  async fetchComments(siteId: string, pagePath: string): Promise<Comment[]> {
    try {
      const { data, error } = await this.client
        .from('holler_comments')
        .select('*')
        .eq('site_id', siteId)
        .eq('page_path', pagePath)
        .order('created_at', { ascending: true })

      if (error) {
        warn('fetchComments error', error.message)
        return []
      }
      return (data ?? []) as Comment[]
    } catch (err) {
      warn('fetchComments threw', err)
      return []
    }
  }

  async createComment(input: NewCommentInput): Promise<Comment | null> {
    const user = (await this.client.auth.getUser()).data.user
    const row = {
      site_id: input.siteId,
      page_path: input.pagePath,
      x_percent: input.xPercent,
      y_percent: input.yPercent,
      viewport_width: input.viewportWidth ?? window.innerWidth,
      body: input.body,
      parent_id: input.parentId ?? null,
      element_selector: input.elementSelector ?? null,
      author_id: user?.id ?? null,
      author_display_name:
        (user?.user_metadata?.full_name as string | undefined) ??
        user?.email ??
        null,
      author_avatar_url:
        (user?.user_metadata?.avatar_url as string | undefined) ?? null,
    }

    try {
      const { data, error } = await this.client
        .from('holler_comments')
        .insert(row)
        .select('*')
        .single()

      if (error) {
        warn('createComment error', error.message)
        return null
      }
      return data as Comment
    } catch (err) {
      warn('createComment threw', err)
      return null
    }
  }

  async resolveComment(commentId: string): Promise<boolean> {
    return this.setResolved(commentId, true)
  }

  async unresolveComment(commentId: string): Promise<boolean> {
    return this.setResolved(commentId, false)
  }

  private async setResolved(commentId: string, resolved: boolean): Promise<boolean> {
    try {
      const user = (await this.client.auth.getUser()).data.user
      const { error } = await this.client
        .from('holler_comments')
        .update({
          resolved,
          resolved_by: resolved ? user?.id ?? null : null,
          resolved_at: resolved ? new Date().toISOString() : null,
        })
        .eq('id', commentId)

      if (error) {
        warn('setResolved error', error.message)
        return false
      }
      return true
    } catch (err) {
      warn('setResolved threw', err)
      return false
    }
  }

  /**
   * Subscribe to real-time inserts/updates/deletes for the given (site, page).
   * The callback receives a "reason" hint plus the row; the UI re-renders.
   */
  subscribeToComments(
    siteId: string,
    pagePath: string,
    cb: (event: 'insert' | 'update' | 'delete', row: Comment) => void,
  ): RealtimeChannel {
    const channel = this.client
      .channel(`holler:${siteId}:${pagePath}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'holler_comments',
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Comment | undefined
          if (!row) return
          // Filter to this page — Supabase filters are single-column, so we
          // have to scrub the page match ourselves.
          if (row.page_path !== pagePath) return
          const type = payload.eventType.toLowerCase() as 'insert' | 'update' | 'delete'
          cb(type, row)
        },
      )
      .subscribe((status) => {
        log('realtime status', status)
      })

    return channel
  }
}
