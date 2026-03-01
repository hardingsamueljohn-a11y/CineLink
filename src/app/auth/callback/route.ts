import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * 認証メールのリンククリック時に呼び出されるエンドポイント
 * メール内の「Confirm your mail」リンクがこのURL（/auth/callback）を指すように設定します
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  
  // Supabaseから送られてくる一時的な確認用コードを取得
  const code = searchParams.get("code");
  
  // 認証後に移動したいページ（デフォルトは /home）
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    // 既存の lib/supabase/server.ts を使用してサーバー用クライアントを取得
    const supabase = await supabaseServer();
    
    // 取得したコードをセッション情報（ログイン状態）と交換する
    // これによりブラウザに認証Cookieが保存されます
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 成功したら、本番ドメイン（origin）＋移動先（next）へリダイレクト
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // エラーが発生した場合は、ログインページにエラー情報を付けて戻す
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}