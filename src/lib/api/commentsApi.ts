// API structure for comments - Future implementation
// This shows how you would structure API calls when you have a backend

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

export interface CreateCommentRequest {
  employeeEmail: string;
  author: string;
  authorRole: string;
  category: string;
  content: string;
  type: 'positive' | 'constructive' | 'negative' | 'recognition';
  priority: 'high' | 'normal' | 'low';
}

export interface UpdateCommentRequest {
  category?: string;
  content?: string;
  type?: 'positive' | 'constructive' | 'negative' | 'recognition';
  priority?: 'high' | 'normal' | 'low';
}

// API endpoints structure
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class CommentsApi {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Get comments for a specific employee
  async getCommentsByEmployee(employeeEmail: string): Promise<Comment[]> {
    try {
      const response = await fetch(`${this.baseUrl}/comments/employee/${employeeEmail}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  // Get all comments (admin only)
  async getAllComments(): Promise<Comment[]> {
    try {
      const response = await fetch(`${this.baseUrl}/comments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all comments:', error);
      throw error;
    }
  }

  // Create a new comment
  async createComment(commentData: CreateCommentRequest): Promise<Comment> {
    try {
      const response = await fetch(`${this.baseUrl}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(commentData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  // Update an existing comment
  async updateComment(commentId: string, updates: UpdateCommentRequest): Promise<Comment> {
    try {
      const response = await fetch(`${this.baseUrl}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  // Delete a comment
  async deleteComment(commentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  // Delete all comments for an employee
  async deleteAllCommentsForEmployee(employeeEmail: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/comments/employee/${employeeEmail}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.deletedCount || 0;
    } catch (error) {
      console.error('Error deleting employee comments:', error);
      throw error;
    }
  }

  // Search comments
  async searchComments(query: string, employeeEmail?: string): Promise<Comment[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        ...(employeeEmail && { employeeEmail })
      });

      const response = await fetch(`${this.baseUrl}/comments/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching comments:', error);
      throw error;
    }
  }

  // Get comment statistics
  async getCommentStats(employeeEmail?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    try {
      const params = new URLSearchParams();
      if (employeeEmail) {
        params.append('employeeEmail', employeeEmail);
      }

      const response = await fetch(`${this.baseUrl}/comments/stats?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching comment stats:', error);
      throw error;
    }
  }

  // Helper method to get auth token
  private getAuthToken(): string {
    // This would typically come from your auth context or localStorage
    return localStorage.getItem('authToken') || '';
  }
}

// Export singleton instance
export const commentsApi = new CommentsApi();
export default commentsApi;
