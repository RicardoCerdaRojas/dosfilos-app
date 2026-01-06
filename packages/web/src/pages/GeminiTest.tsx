import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { libraryService } from '@dosfilos/application';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { GeminiFileSearchService } from '@dosfilos/infrastructure';
import { Loader2 } from 'lucide-react';
import { useFirebase } from '@/context/firebase-context';

export function GeminiTest() {
    const { user } = useFirebase();
    const [fileUris, setFileUris] = useState<string[]>(() => {
        const saved = localStorage.getItem('gemini_file_uris');
        return saved ? JSON.parse(saved) : [];
    });
    const [resources, setResources] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [storeName, setStoreName] = useState<string>(() => {
        return localStorage.getItem('gemini_store_name') || '';
    });
    const [cacheName, setCacheName] = useState<string>(() => {
        return localStorage.getItem('gemini_cache_name') || '';
    });
    const [loading, setLoading] = useState(false);
    const [chatMsg, setChatMsg] = useState('');
    const [chatResponse, setChatResponse] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem('gemini_file_uris', JSON.stringify(fileUris));
    }, [fileUris]);

    useEffect(() => {
        localStorage.setItem('gemini_store_name', storeName);
    }, [storeName]);

    useEffect(() => {
        localStorage.setItem('gemini_cache_name', cacheName);
    }, [cacheName]);

    useEffect(() => {
        if (user) {
            libraryService.getUserResources(user.uid).then(setResources);
        }
    }, [user]);

    const handleCreateStore = async () => {
        setLoading(true);
        try {
            const functions = getFunctions();
            // Use 'createGeminiStore' function name
            const createStore = httpsCallable(functions, 'createGeminiStore');
            const result = await createStore({ resourceIds: Array.from(selectedIds) });
            const data = result.data as any;
            console.log('📦 CreateStore Result:', data);
            
            setStoreName(data.storeName);
            if (data.fileUris) {
                console.log('✅ Received File URIs:', data.fileUris);
                setFileUris(data.fileUris);
            } else {
                console.warn('⚠️ No file URIs returned from function');
            }
            alert(`Store created with ${data.fileCount} files!`);
        } catch (e) {
            console.error(e);
            alert('Error creating store: ' + (e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCache = async () => {
        if (fileUris.length === 0) return;
        setLoading(true);
        try {
            const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
            const service = new GeminiFileSearchService(apiKey);
            const name = await service.createCache(fileUris);
            setCacheName(name);
            alert(`Cache created! Name: ${name}`);
        } catch (e) {
            console.error(e);
            alert('Error creating cache: ' + (e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleChat = async () => {
        if (!chatMsg) return;
        setChatLoading(true);
        console.log('💬 Starting chat. File URIs:', fileUris, 'Store:', storeName, 'Cache:', cacheName);
        const startTime = performance.now();
        
        try {
            const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
            const service = new GeminiFileSearchService(apiKey);
            
            let response;
            if (cacheName) {
                console.log('🚀 Using chatWithCache (Fastest)');
                response = await service.chatWithCache(chatMsg, cacheName);
            } else if (fileUris.length > 0) {
                console.log('🚀 Using chatWithFiles (Direct)');
                // Use direct file context (Multimodal) - Faster & More Reliable
                response = await service.chatWithFiles(chatMsg, fileUris);
            } else if (storeName) {
                // Fallback to Store (RAG)
                response = await service.chatWithStore(chatMsg, storeName);
            } else {
                alert("No active store or files!");
                return;
            }
            
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            console.log(`⏱️ Response received in ${duration}s`);
            
            setChatResponse(response + `\n\n(⏱️ Tiempo de respuesta: ${duration}s)`);
        } catch (e) {
            console.error(e);
            alert('Chat Error: ' + (e as Error).message);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
                <h1 className="text-2xl font-bold">Gemini File Search Test 🧪</h1>
            </div>

            <Card className="p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">1. Select Documents</h2>
                
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto border rounded p-2">
                    {resources.map(res => (
                        <div key={res.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                            <input 
                                type="checkbox" 
                                id={res.id}
                                checked={selectedIds.has(res.id)}
                                onChange={(e) => {
                                    const newSet = new Set(selectedIds);
                                    if (e.target.checked) newSet.add(res.id);
                                    else newSet.delete(res.id);
                                    setSelectedIds(newSet);
                                }}
                                className="w-4 h-4"
                            />
                            <label htmlFor={res.id} className="text-sm cursor-pointer flex-1">
                                <span className="font-medium">{res.title}</span>
                                <span className="text-gray-400 ml-2 text-xs">({res.type})</span>
                            </label>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 justify-end">
                    <Button 
                        onClick={handleCreateStore} 
                        disabled={loading || selectedIds.size === 0}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Create Store & Upload
                    </Button>
                </div>
            </Card>

            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-2 text-blue-800">2. Test Chat</h2>
                <div className="mb-4">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Active Store ID / Files / Cache</label>
                    <div className="flex gap-2 mb-2">
                        <Input 
                            value={storeName} 
                            onChange={e => setStoreName(e.target.value)} 
                            placeholder="Enter Store ID (fileSearchStores/...)"
                            className="bg-white font-mono text-sm flex-1"
                        />
                        <Input 
                            placeholder="Or paste File URI (https://...)"
                            className="bg-white font-mono text-sm flex-1"
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value;
                                    if (val) setFileUris(prev => [...prev, val]);
                                    (e.target as HTMLInputElement).value = '';
                                }
                            }}
                        />
                    </div>
                    
                    {/* Cache Status & Controls */}
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded border mb-2">
                        <div className="flex flex-col gap-1">
                            {cacheName ? (
                                <div className="text-xs text-purple-600 font-bold flex items-center gap-1">
                                    ⚡ CACHE ACTIVE: <span className="font-mono font-normal text-gray-600">{cacheName}</span>
                                </div>
                            ) : fileUris.length > 0 ? (
                                <div className="text-xs text-orange-600 font-medium">
                                    ⚠️ No Cache (Slow Mode)
                                </div>
                            ) : (
                                <div className="text-xs text-gray-400">No files selected</div>
                            )}
                            
                            {fileUris.length > 0 && (
                                <div className="text-xs text-green-600 font-medium flex flex-col gap-1">
                                    <div>✅ Using {fileUris.length} files directly</div>
                                    {fileUris.map((uri, i) => (
                                        <div key={i} className="pl-2 text-gray-500 truncate w-64" title={uri}>{uri}</div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {!cacheName && fileUris.length > 0 && (
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={handleCreateCache}
                                disabled={loading}
                                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : "⚡ Create Cache"}
                            </Button>
                        )}
                        
                        {cacheName && (
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setCacheName('')}
                                className="text-red-500 hover:text-red-700 h-6 text-xs"
                            >
                                Clear Cache
                            </Button>
                        )}
                    </div>
                </div>
                
                <div className="flex gap-2 mb-4">
                    <Input 
                        value={chatMsg} 
                        onChange={e => setChatMsg(e.target.value)} 
                        placeholder="Ask a question about the documents..."
                        onKeyDown={e => e.key === 'Enter' && handleChat()}
                    />
                    <Button onClick={handleChat} disabled={chatLoading || (!storeName && fileUris.length === 0)}>
                        {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
                    </Button>
                </div>
                
                {chatResponse && (
                    <div className="mt-4 p-4 bg-white rounded border shadow-sm">
                        <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">Gemini Response</h3>
                        <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-sm">{chatResponse}</pre>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
