'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, FolderPlus, Loader2 } from 'lucide-react';
import { useCreateFolder } from '../api/hooks';
import { toast } from 'sonner';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateFolderModal({ isOpen, onClose }: CreateFolderModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const { mutate: createFolder, isPending } = useCreateFolder();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim()) {
            toast.error('Please enter a folder name');
            return;
        }

        createFolder(
            { name: name.trim(), description: description.trim() },
            {
                onSuccess: () => {
                    toast.success('Folder created successfully');
                    setName('');
                    setDescription('');
                    onClose();
                },
                onError: () => {
                    toast.error('Failed to create folder');
                }
            }
        );
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-2xl transition-all border border-slate-200">
                                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/80 bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 ring-4 ring-blue-50">
                                            <FolderPlus className="w-5 h-5" />
                                        </div>
                                        <Dialog.Title as="h3" className="text-xl font-semibold text-slate-900 tracking-tight">
                                            New Case Folder
                                        </Dialog.Title>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-6">
                                    <form id="createFolderForm" onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Folder Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                autoFocus
                                                placeholder="e.g. State v. Sharma"
                                                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Description <span className="text-slate-400 font-normal">(Optional)</span>
                                            </label>
                                            <textarea
                                                id="description"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                rows={3}
                                                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm transition-all text-sm resize-none"
                                                placeholder="Brief context about this case..."
                                            />
                                        </div>
                                    </form>
                                </div>

                                <div className="px-6 py-5 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        form="createFolderForm"
                                        disabled={isPending || !name.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm shadow-blue-600/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Folder'
                                        )}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
