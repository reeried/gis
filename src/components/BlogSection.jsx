import { useEffect, useState } from 'react';
import { getBlogContent } from '../services/riverData';

export default function BlogSection() {
  const [content, setContent] = useState({ background: '', profile: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getBlogContent();
        setContent({
          background: data?.background || '',
          profile: data?.profile || '',
        });
      } catch (err) {
        console.error('Failed to load blog content', err);
        setError('Gagal memuat konten blog');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  return (
    <div className="mt-6 px-4 pb-6">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="text-center">
          <p className="text-2xl font-bold uppercase text-gray-800 tracking-wide">
            Latar Belakang dan Profil Sungai Kota Kupang
          </p>
        </div>

        {loading ? (
          <div className="text-gray-500">Memuat konten...</div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Latar Belakang</h4>
              <div
                className="prose prose-sm max-w-none text-blue-900"
                dangerouslySetInnerHTML={{ __html: content.background || '<p>Belum ada konten.</p>' }}
              />
            </div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Profil Sungai Kota Kupang</h4>
              <div
                className="prose prose-sm max-w-none text-green-900"
                dangerouslySetInnerHTML={{ __html: content.profile || '<p>Belum ada konten.</p>' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

