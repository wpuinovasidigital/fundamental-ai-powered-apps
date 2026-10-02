import { Transaction, TransactionUpdate } from '@/types/transaction';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface McpAuthSession {
  supabase: SupabaseClient;
  userId: string;
  userEmail: string;
}

let cacheSession: McpAuthSession | null = null;

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Key is missing');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function loginToMcp(email: string, password: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new Error(
      `Login failed: ${error?.message || 'Email or password is incorect'}`,
    );
  }

  cacheSession = {
    supabase,
    userId: data.user.id,
    userEmail: data.user.email || email,
  };

  return {
    userId: data.user.id,
    email: data.user.email || email,
  };
}

export async function logoutFromMcp() {
  cacheSession = null;
}

export function getMcpAuthStatus() {
  if (cacheSession) {
    return {
      isAuthenticated: true,
      email: cacheSession.userEmail,
      userId: cacheSession.userId,
    };
  }
  return {
    isAuthenticated: false,
  };
}

export async function getMcpSession() {
  if (cacheSession) {
    return cacheSession;
  }

  throw new Error('Please login with your Fina Account.');
}

export async function getBalanceSummary() {
  const { supabase, userId } = await getMcpSession();

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  const { totalIncome, totalExpense, savings } = (data || []).reduce(
    (acc, tx) => {
      if (tx.type === 'income') acc.totalIncome += tx.amount;
      else if (tx.type === 'expense') acc.totalExpense += tx.amount;
      acc.savings = acc.totalIncome - acc.totalExpense;
      return acc;
    },
    {
      totalIncome: 0,
      totalExpense: 0,
      savings: 0,
    },
  );

  return {
    totalIncome,
    totalExpense,
    savings,
  };
}

export async function getTransactions(params?: {
  limit?: number;
  page?: number;
  search?: string;
  category?: string;
  type?: 'income' | 'expense';
}) {
  const { limit = 10, page = 1, search, category, type } = params || {};
  const { supabase, userId } = await getMcpSession();

  let query = supabase
    .from('transactions')
    .select('id, amount, type, description, date, category, created_at', {
      count: 'exact',
    })
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', {
      ascending: false,
    });

  if (search) {
    query = query.ilike('description', `%${search}%`);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (type) {
    query = query.eq('type', type);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  const totalData = count || 0;

  return {
    data: data || [],
    totalData,
    totalPages: Math.ceil(totalData / limit),
    page,
    limit,
  };
}

export async function generateEmbeddingMCP(contents: string) {
  const apiKey = process.env.GOOGLE_GEN_AI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents,
      config: {
        outputDimensionality: 768,
      },
    });

    if (
      response.embeddings &&
      response.embeddings.length > 0 &&
      response.embeddings[0].values
    ) {
      return response.embeddings[0].values;
    }
    return null;
  } catch {
    return null;
  }
}

export async function semanticSearchTransactions(
  query: string,
  match_threshold?: number,
  match_count?: number,
) {
  const { supabase, userId } = await getMcpSession();

  const queryEmbedding = await generateEmbeddingMCP(query);

  if (!queryEmbedding) {
    return getTransactions({ search: query, limit: match_count });
  }

  const { data, error } = await supabase.rpc('match_transactions', {
    query_embedding: queryEmbedding,
    match_threshold: match_threshold || 0.3,
    match_count: match_count || 15,
  });

  if (error) {
    throw new Error('Failed to perform semantic search.');
  }

  return data.filter((tx: Transaction) => tx.user_id === userId);
}

export async function createTransaction(
  transaction: Omit<Transaction, 'id' | 'user_id' | 'embedding'>,
) {
  const { supabase, userId } = await getMcpSession();

  const payload: Record<string, unknown> = { ...transaction, user_id: userId };
  const embeddingVector = await generateEmbeddingMCP(
    JSON.stringify(transaction),
  );
  if (embeddingVector) payload.embedding = embeddingVector;

  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select('type, category, amount, description, date')
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function deleteTransaction(id: string) {
  const { supabase, userId } = await getMcpSession();
  const { error, success } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  return success;
}

export async function updateTransaction(
  id: string,
  transaction: Omit<TransactionUpdate, 'id' | 'user_id' | 'embedding'>,
) {
  const { supabase, userId } = await getMcpSession();

  const payload: Record<string, unknown> = { ...transaction };
  const embeddingVector = await generateEmbeddingMCP(
    JSON.stringify(transaction),
  );
  if (embeddingVector) payload.embedding = embeddingVector;

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('type, category, amount, description, date')
    .single();

  if (error) throw new Error(error.message);

  return data;
}
