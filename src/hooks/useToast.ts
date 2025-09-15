import { toast } from 'sonner';

export const useToast = () => {
  return {
    success: (message: string, description?: string) => {
      toast.success(message, {
        description,
        duration: 4000,
      });
    },
    
    error: (message: string, description?: string) => {
      toast.error(message, {
        description,
        duration: 5000,
      });
    },
    
    warning: (message: string, description?: string) => {
      toast.warning(message, {
        description,
        duration: 4000,
      });
    },
    
    info: (message: string, description?: string) => {
      toast.info(message, {
        description,
        duration: 3000,
      });
    },
    
    loading: (message: string) => {
      return toast.loading(message);
    },
    
    dismiss: (toastId?: string | number) => {
      toast.dismiss(toastId);
    },
    
    promise: <T>(
      promise: Promise<T>,
      {
        loading,
        success,
        error,
      }: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      return toast.promise(promise, {
        loading,
        success,
        error,
      });
    }
  };
};
