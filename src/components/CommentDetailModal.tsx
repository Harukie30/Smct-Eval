'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CommentDetailModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  comment: any;
}

const getCommentTypeIcon = (type: string) => {
  switch (type) {
    case 'positive': return '✅';
    case 'constructive': return '💡';
    case 'negative': return '⚠️';
    case 'recognition': return '🏆';
    default: return '💬';
  }
};

const getCommentTypeColor = (type: string) => {
  switch (type) {
    case 'positive': return 'bg-green-100 text-green-800';
    case 'constructive': return 'bg-blue-100 text-blue-800';
    case 'negative': return 'bg-red-100 text-red-800';
    case 'recognition': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'normal': return 'bg-blue-100 text-blue-800';
    case 'low': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function CommentDetailModal({
  isOpen,
  onCloseAction,
  comment
}: CommentDetailModalProps) {
  if (!comment) return null;

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-2xl">{getCommentTypeIcon(comment.type)}</span>
            Comment Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8">
          {/* Comment Header */}
          <Card className="bg-gray-50 shadow-sm">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{comment.author}</h3>
                  <p className="text-sm text-gray-600 mb-4">{comment.authorRole}</p>
                  <div className="flex items-center gap-3">
                    <Badge className={getCommentTypeColor(comment.type)}>
                      {comment.type}
                    </Badge>
                    <Badge variant="outline">{comment.category}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getPriorityColor(comment.priority)}>
                    {comment.priority} Priority
                  </Badge>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      {new Date(comment.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(comment.date).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comment Content */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Comment Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-6 rounded-lg border ${
                comment.type === 'positive' ? 'bg-green-50 border-green-200' :
                comment.type === 'constructive' ? 'bg-blue-50 border-blue-200' :
                comment.type === 'negative' ? 'bg-red-50 border-red-200' :
                comment.type === 'recognition' ? 'bg-yellow-50 border-yellow-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base">
                  {comment.content}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Comment Metadata */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Comment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-4">Type & Category</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 font-medium">Type:</span>
                      <Badge className={getCommentTypeColor(comment.type)}>
                        {comment.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 font-medium">Category:</span>
                      <Badge variant="outline">{comment.category}</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-4">Priority & Date</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 font-medium">Priority:</span>
                      <Badge className={getPriorityColor(comment.priority)}>
                        {comment.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 font-medium">Date:</span>
                      <span className="text-sm text-gray-800">
                        {new Date(comment.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Author Information */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Author Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-base">
                      {comment.author.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-lg">{comment.author}</h4>
                    <p className="text-sm text-gray-600">{comment.authorRole}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
          <Button onClick={onCloseAction} variant="outline" className="px-6">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
