'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface WriteCommentModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onSubmitAction: (comment: string, category: string) => void;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  position?: string;
  title?: string;
  placeholder?: string;
  maxLength?: number;
  categories?: string[];
  defaultCategory?: string;
  isLoading?: boolean;
}

export default function WriteCommentModal({
  isOpen,
  onCloseAction,
  onSubmitAction,
  employeeName,
  employeeEmail,
  department,
  position,
  title = "Write Comment",
  placeholder = "Enter your comment here...",
  maxLength = 1000,
  categories = ["General", "Performance", "Behavior", "Improvement", "Recognition"],
  defaultCategory = "General",
  isLoading = false
}: WriteCommentModalProps) {
  const [comment, setComment] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!comment.trim()) {
      setError('Please enter a comment');
      return;
    }

    if (comment.length > maxLength) {
      setError(`Comment is too long. Maximum ${maxLength} characters allowed.`);
      return;
    }

    setError('');
    onSubmitAction(comment.trim(), selectedCategory);
  };

  const handleClose = () => {
    setComment('');
    setSelectedCategory(defaultCategory);
    setError('');
    onCloseAction();
  };

  const characterCount = comment.length;
  const isOverLimit = characterCount > maxLength;
  const remainingChars = maxLength - characterCount;

  return (
    <Dialog open={isOpen} onOpenChangeAction={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8">
          {/* Employee Information */}
          {(employeeName || employeeEmail || department || position) && (
            <Card className="bg-gray-50">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employeeName && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Employee</Label>
                      <p className="text-sm font-semibold text-gray-900">{employeeName}</p>
                    </div>
                  )}
                  {employeeEmail && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Email</Label>
                      <p className="text-sm text-gray-700">{employeeEmail}</p>
                    </div>
                  )}
                  {position && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Position</Label>
                      <p className="text-sm text-gray-700">{position}</p>
                    </div>
                  )}
                  {department && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Department</Label>
                      <Badge variant="outline" className="text-xs">
                        {department}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Selection */}
          <div>
            <Label htmlFor="category" className="text-sm font-medium text-gray-700 mb-3 block">
              Comment Category
            </Label>
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={`text-xs ${
                    selectedCategory === category 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Comment Input */}
          <div>
            <Label htmlFor="comment" className="text-sm font-medium text-gray-700 mb-3 block">
              Your Comment
            </Label>
            <Textarea
              id="comment"
              placeholder={placeholder}
              value={comment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setComment(e.target.value);
                if (error) setError('');
              }}
              className={`min-h-[140px] resize-none ${
                isOverLimit ? 'border-red-300 focus:border-red-500' : ''
              }`}
              disabled={isLoading}
            />
            
            {/* Character Counter */}
            <div className="flex justify-between items-center mt-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${
                  isOverLimit ? 'text-red-600' : 
                  characterCount > maxLength * 0.8 ? 'text-yellow-600' : 'text-gray-500'
                }`}>
                  {characterCount} / {maxLength} characters
                </span>
                {isOverLimit && (
                  <span className="text-xs text-red-600 font-medium">
                    ({remainingChars} over limit)
                  </span>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-200 ${
                    isOverLimit ? 'bg-red-500' :
                    characterCount > maxLength * 0.8 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((characterCount / maxLength) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>

          {/* Comment Preview */}
          {comment.trim() && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-blue-800 mb-2 block">
                  Preview
                </Label>
                <div className="bg-white p-3 rounded border border-blue-300">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment}</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    {selectedCategory}
                  </Badge>
                  <span className="text-xs text-blue-600">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t mt-8">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !comment.trim() || isOverLimit}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              'Submit Comment'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
