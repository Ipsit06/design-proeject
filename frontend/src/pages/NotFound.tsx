import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { ROUTES } from '../router/routes.js';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-sage text-forest flex items-center justify-center mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-ink">Page Not Found</h1>
      <p className="text-sm text-ink-secondary max-w-sm mt-2 mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button
        variant="primary"
        onClick={() => navigate(ROUTES.DASHBOARD)}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Return to Dashboard
      </Button>
    </div>
  );
};

export default NotFound;
