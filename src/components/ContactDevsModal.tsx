'use client';

import React from 'react'; // Removed useState
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button'; // Keep Button for Close button
// Removed Input, Label, Textarea, toastMessages
import Link from 'next/link'; // Import Link for navigation

interface Developer {
  id: string;
  name: string;
  avatar: string; // Emoji or image URL
  link: string; // External link for the developer
}

const developers: Developer[] = [
  { id: 'dev1', name: 'Alice Smith', avatar: '/smct.png', link: 'https://github.com/alice' },
  { id: 'dev2', name: 'Bob Johnson', avatar: '/smct.png', link: 'https://linkedin.com/in/bob' },
  { id: 'dev3', name: 'Charlie Brown', avatar: '/smct.png', link: 'https://portfolio.com/charlie' },
  { id: 'dev4', name: 'Diana Prince', avatar: '/smct.png', link: 'https://twitter.com/diana' },
  { id: 'general', name: 'General Support', avatar: '/smct.png', link: 'mailto:support@example.com' },
];

interface ContactDevsModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
}

export default function ContactDevsModal({ isOpen, onCloseAction }: ContactDevsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent className="sm:max-w-xl animate-popup text-center">
        <DialogHeader>
          <DialogTitle>Meet Our Developers</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 px-6 py-4">
          <p className="text-gray-700 leading-relaxed mb-4">
            Click on a developer's icon to learn more about their work or connect with them!
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 justify-items-center max-h-72 overflow-y-auto custom-scrollbar pr-2">
            {developers.map((dev) => (
              <Link key={dev.id} href={dev.link} passHref target="_blank" rel="noopener noreferrer" className="flex flex-col items-center group cursor-pointer">
                <div className="h-16 w-16 mb-2 rounded-full overflow-hidden bg-gray-100 group-hover:bg-blue-50 transition-all transform group-hover:scale-110 shadow-sm group-hover:shadow-md">
                  <img src={dev.avatar} alt={dev.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{dev.name}</span>
              </Link>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button type="button" className='bg-blue-700 hover:bg-blue-400' onClick={onCloseAction}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
