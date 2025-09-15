'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, User, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuspensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suspensionData: {
    reason: string;
    suspendedAt: string;
    suspendedBy: string;
    accountName: string;
  };
}

const SuspensionModal: React.FC<SuspensionModalProps> = ({
  isOpen,
  onClose,
  suspensionData
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChangeAction={(open) => !open && onClose()}>
          <DialogContent className="sm:max-w-xl p-8 bg-blue-200 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.4 
              }}
            >
              <DialogHeader>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                    >
                      <AlertTriangle className="h-13 w-13" />
                    </motion.div>
                    Account Suspended
                  </DialogTitle>
                </motion.div>
              </DialogHeader>

              <motion.div 
                className="space-y-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                {/* Account Info */}
                <motion.div 
                  className="bg-red-100 mt-4 border border-red-200 rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 text-red-800 font-medium mb-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 400 }}
                    >
                      <User className="h-7 w-7" />
                    </motion.div>
                    Account: {suspensionData.accountName}
                  </div>
                  <p className="text-red-700 text-sm leading-relaxed">
                    Your account has been suspended and you cannot access the system at this time.
                  </p>
                </motion.div>

                {/* Suspension Details */}
                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.3 }}
                >
                  <motion.div 
                    className="flex items-start gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7, duration: 0.3 }}
                  >
                    <FileText className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 mb-2">Reason for Suspension:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border leading-relaxed">
                        {suspensionData.reason}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.3 }}
                  >
                    <Clock className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 mb-1">Suspended On:</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(suspensionData.suspendedAt)}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9, duration: 0.3 }}
                  >
                    <User className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 mb-1">Suspended By:</p>
                      <p className="text-sm text-gray-600">
                        {suspensionData.suspendedBy}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Contact Information */}
                <motion.div 
                  className="bg-blue-50 border border-blue-200 rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, duration: 0.3 }}
                >
                  <h4 className="text-sm font-medium text-blue-800 mb-3">
                    Need Help?
                  </h4>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    If you believe this suspension is in error or need assistance,
                    please contact your system administrator or HR department.
                  </p>
                </motion.div>

                {/* Action Buttons */}
                <motion.div 
                  className="flex justify-end gap-3 pt-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.3 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Button
                      
                      onClick={onClose}
                      className="text-black px-6 bg-red-200 hover:bg-red-400"
                    >
                     ❌ Close
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default SuspensionModal;
