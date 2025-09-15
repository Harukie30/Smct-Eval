// Comments Service for managing employee comments and feedback
import commentsData from '@/data/comments.json';

export interface Comment {
  id: string;
  employeeEmail: string;
  author: string;
  authorRole: string;
  category: string;
  content: string;
  date: string;
  type: 'positive' | 'constructive' | 'negative' | 'recognition';
  priority: 'high' | 'normal' | 'low';
}

class CommentsService {
  private comments: Comment[] = [];

  constructor() {
    this.loadComments();
  }

  // Load comments from localStorage or use mock data
  private loadComments(): void {
    try {
      const storedComments = localStorage.getItem('employeeComments');
      if (storedComments) {
        this.comments = JSON.parse(storedComments);
      } else {
        // Initialize with mock data
        this.comments = [...commentsData];
        this.saveComments();
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      this.comments = [...commentsData];
    }
  }

  // Save comments to localStorage
  private saveComments(): void {
    try {
      localStorage.setItem('employeeComments', JSON.stringify(this.comments));
    } catch (error) {
      console.error('Error saving comments:', error);
    }
  }

  // Get comments for a specific employee
  getCommentsByEmployee(employeeEmail: string): Comment[] {
    return this.comments
      .filter(comment => comment.employeeEmail === employeeEmail)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Get all comments
  getAllComments(): Comment[] {
    return [...this.comments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Add a new comment
  addComment(comment: Omit<Comment, 'id' | 'date'>): Comment {
    const newComment: Comment = {
      ...comment,
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString()
    };

    this.comments.push(newComment);
    this.saveComments();
    return newComment;
  }

  // Update an existing comment
  updateComment(commentId: string, updates: Partial<Comment>): Comment | null {
    const index = this.comments.findIndex(comment => comment.id === commentId);
    if (index === -1) return null;

    this.comments[index] = { ...this.comments[index], ...updates };
    this.saveComments();
    return this.comments[index];
  }

  // Delete a comment
  deleteComment(commentId: string): boolean {
    const index = this.comments.findIndex(comment => comment.id === commentId);
    if (index === -1) return false;

    this.comments.splice(index, 1);
    this.saveComments();
    return true;
  }

  // Delete all comments for an employee
  deleteAllCommentsForEmployee(employeeEmail: string): number {
    const initialLength = this.comments.length;
    this.comments = this.comments.filter(comment => comment.employeeEmail !== employeeEmail);
    const deletedCount = initialLength - this.comments.length;
    
    if (deletedCount > 0) {
      this.saveComments();
    }
    
    return deletedCount;
  }

  // Search comments
  searchComments(query: string, employeeEmail?: string): Comment[] {
    const searchLower = query.toLowerCase();
    let filteredComments = employeeEmail 
      ? this.getCommentsByEmployee(employeeEmail)
      : this.getAllComments();

    return filteredComments.filter(comment =>
      comment.content.toLowerCase().includes(searchLower) ||
      comment.author.toLowerCase().includes(searchLower) ||
      comment.category.toLowerCase().includes(searchLower) ||
      comment.type.toLowerCase().includes(searchLower) ||
      comment.authorRole.toLowerCase().includes(searchLower)
    );
  }

  // Get comment statistics
  getCommentStats(employeeEmail?: string): {
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const comments = employeeEmail 
      ? this.getCommentsByEmployee(employeeEmail)
      : this.getAllComments();

    const stats = {
      total: comments.length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byCategory: {} as Record<string, number>
    };

    comments.forEach(comment => {
      // Count by type
      stats.byType[comment.type] = (stats.byType[comment.type] || 0) + 1;
      
      // Count by priority
      stats.byPriority[comment.priority] = (stats.byPriority[comment.priority] || 0) + 1;
      
      // Count by category
      stats.byCategory[comment.category] = (stats.byCategory[comment.category] || 0) + 1;
    });

    return stats;
  }

  // Clear all comments (for testing/reset purposes)
  clearAllComments(): void {
    this.comments = [];
    this.saveComments();
  }

  // Reset to mock data
  resetToMockData(): void {
    this.comments = [...commentsData];
    this.saveComments();
  }
}

// Export singleton instance
export const commentsService = new CommentsService();
export default commentsService;
