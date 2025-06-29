/**
 * チャット履歴のページネーション管理ユーティリティ
 */
import { getAuthHeadersSync } from './auth';

export interface PaginationState {
  currentPage: number;
  hasMore: boolean;
  isLoading: boolean;
  totalMessages: number;
}

export interface PaginatedMessages {
  messages: any[];
  pagination: PaginationState;
}

export interface ChatPaginationManager {
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  state: PaginationState;
}

/**
 * チャット履歴の仮想スクロール対応ページネーション
 */
export class ChatPaginationService {
  private characterId: string;
  private messagesPerPage: number;
  private state: PaginationState;
  private allMessages: any[] = [];
  private onStateChange: (state: PaginationState) => void;
  private onMessagesUpdate: (messages: any[]) => void;

  constructor(
    characterId: string,
    onStateChange: (state: PaginationState) => void,
    onMessagesUpdate: (messages: any[]) => void,
    messagesPerPage = 50
  ) {
    this.characterId = characterId;
    this.messagesPerPage = messagesPerPage;
    this.onStateChange = onStateChange;
    this.onMessagesUpdate = onMessagesUpdate;
    this.state = {
      currentPage: 1,
      hasMore: true,
      isLoading: false,
      totalMessages: 0
    };
  }

  /**
   * 初期メッセージ読み込み
   */
  async loadInitial(): Promise<void> {
    this.setState({ isLoading: true });
    
    try {
      const response = await fetch(`/api/v1/chats/${this.characterId}?page=1&limit=${this.messagesPerPage}`, {
        headers: getAuthHeadersSync()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const messages = data.chat?.messages || [];
      
      this.allMessages = messages;
      this.setState({
        currentPage: 1,
        hasMore: messages.length >= this.messagesPerPage,
        totalMessages: data.metadata?.totalMessages || messages.length,
        isLoading: false
      });
      
      this.onMessagesUpdate(this.allMessages);
      
    } catch (error) {
      console.error('Initial chat load failed:', error);
      this.setState({ isLoading: false });
      throw error;
    }
  }

  /**
   * 過去のメッセージを読み込み（上スクロール時）
   */
  async loadMore(): Promise<void> {
    if (this.state.isLoading || !this.state.hasMore) {
      return;
    }

    this.setState({ isLoading: true });

    try {
      const nextPage = this.state.currentPage + 1;
      const response = await fetch(
        `/api/v1/chats/${this.characterId}?page=${nextPage}&limit=${this.messagesPerPage}`,
        {
          headers: getAuthHeadersSync()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const newMessages = data.chat?.messages || [];
      
      // 新しいメッセージを配列の先頭に追加（古いメッセージなので）
      this.allMessages = [...newMessages, ...this.allMessages];
      
      this.setState({
        currentPage: nextPage,
        hasMore: newMessages.length >= this.messagesPerPage,
        isLoading: false
      });
      
      this.onMessagesUpdate(this.allMessages);
      
    } catch (error) {
      console.error('Load more messages failed:', error);
      this.setState({ isLoading: false });
      throw error;
    }
  }

  /**
   * 新しいメッセージを追加
   */
  addMessage(message: any): void {
    this.allMessages = [...this.allMessages, message];
    this.setState({
      totalMessages: this.state.totalMessages + 1
    });
    this.onMessagesUpdate(this.allMessages);
  }

  /**
   * 複数の新しいメッセージを追加
   */
  addMessages(messages: any[]): void {
    this.allMessages = [...this.allMessages, ...messages];
    this.setState({
      totalMessages: this.state.totalMessages + messages.length
    });
    this.onMessagesUpdate(this.allMessages);
  }

  /**
   * メッセージリストを更新
   */
  updateMessages(messages: any[]): void {
    this.allMessages = messages;
    this.setState({
      totalMessages: messages.length
    });
    this.onMessagesUpdate(this.allMessages);
  }

  /**
   * 履歴をリフレッシュ
   */
  async refresh(): Promise<void> {
    this.reset();
    await this.loadInitial();
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.allMessages = [];
    this.setState({
      currentPage: 1,
      hasMore: true,
      isLoading: false,
      totalMessages: 0
    });
    this.onMessagesUpdate([]);
  }

  /**
   * 現在のメッセージ配列を取得
   */
  getMessages(): any[] {
    return this.allMessages;
  }

  /**
   * 現在の状態を取得
   */
  getState(): PaginationState {
    return { ...this.state };
  }

  /**
   * スクロール位置の管理（仮想スクロール対応）
   */
  getVisibleMessages(scrollTop: number, containerHeight: number, itemHeight = 100): {
    visibleMessages: any[];
    startIndex: number;
    endIndex: number;
  } {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 5, // バッファ追加
      this.allMessages.length
    );

    return {
      visibleMessages: this.allMessages.slice(startIndex, endIndex),
      startIndex,
      endIndex
    };
  }

  /**
   * 状態更新
   */
  private setState(updates: Partial<PaginationState>): void {
    this.state = { ...this.state, ...updates };
    this.onStateChange(this.state);
  }
}

/**
 * チャットページネーション用のインターフェース（React Hook用）
 * 実際の使用時は React の useState, useEffect を使用してください
 */
export interface UseChatPaginationResult {
  messages: any[];
  state: PaginationState;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  addMessage: (message: any) => void;
  addMessages: (msgs: any[]) => void;
  updateMessages: (msgs: any[]) => void;
  getVisibleMessages: (scrollTop: number, containerHeight: number, itemHeight?: number) => {
    visibleMessages: any[];
    startIndex: number;
    endIndex: number;
  };
}