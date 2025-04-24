'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import { UseChatHelpers } from '@ai-sdk/react';

interface SuggestedActionsProps {
  chatId: string;
  append: UseChatHelpers['append'];
}

function PureSuggestedActions({ chatId, append }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Remote Work Remote Work in London',
      label: 'What do 30–45 y/o professionals in London think about hybrid offices?',
      action: 'How do tech workers feel about remote work?',
    },
    {
      title: 'Food Delivery Trends',
      label: 'How do 18–24 y/o urban dwellers in Austin use food-delivery apps?',
      action: 'How do 18–24 y/o urban dwellers in Austin use food-delivery apps?',
    },
    {
      title: 'Healthcare Opinions',
      label: 'What do 65+ seniors in Chicago think about healthcare reform?',
      action: 'What do 65+ seniors in Chicago think about healthcare reform?',
    },
    {
      title: 'Streaming Preferences',
      label: 'How do 30-45 y/o parents choose streaming services?',
      action: 'How do 30-45 y/o parents choose streaming services?',
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-4 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              append({
                role: 'user',
                content: suggestedAction.action,
              });
            }}
            className="text-left border rounded-xl px-4 py-4 text-sm flex flex-col w-full h-auto min-h-[120px] justify-start items-start overflow-visible"
          >
            <span className="font-medium mb-2 text-base">{suggestedAction.title}</span>
            <span className="text-muted-foreground text-xs leading-relaxed whitespace-normal">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
