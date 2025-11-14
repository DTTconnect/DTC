# Deploying to Vercel

This guide will help you deploy your Lovable Clone to Vercel.

## Prerequisites

- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Your GitHub repository pushed
- API keys ready:
  - Anthropic API key from [console.anthropic.com](https://console.anthropic.com/dashboard)
  - (Optional) Daytona API key from [daytona.io](https://www.daytona.io/) - only needed for local development

## Important: Deployment Configuration

The project has been automatically configured with a root `vercel.json` that:
- Sets the build directory to `lovable-ui/`
- Configures API route timeouts (5 minutes)
- Handles routing properly

**You don't need to manually configure the root directory** - it's already set up!

## Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"

2. **Connect Your Repository**
   - Select your GitHub repository
   - Vercel will auto-detect it's a Next.js project

3. **Configure Project Settings**
   - Leave **Root Directory** as default (root) - our `vercel.json` handles this
   - Framework Preset: Next.js (auto-detected)
   - Build settings will be read from `vercel.json` automatically

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   ```
   ANTHROPIC_API_KEY = sk-ant-your-key-here
   DAYTONA_API_KEY = your-daytona-key-here
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for the build to complete
   - You'll get a URL like `your-project.vercel.app`

## Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to your project**
   ```bash
   cd lovable-ui
   ```

4. **Deploy**
   ```bash
   vercel
   ```

   When prompted:
   - Set up and deploy? `Y`
   - Which scope? Select your account
   - Link to existing project? `N`
   - What's your project's name? `lovable-clone` (or your choice)
   - In which directory is your code located? `./`

5. **Add Environment Variables**
   ```bash
   vercel env add ANTHROPIC_API_KEY
   # Paste your key when prompted

   vercel env add DAYTONA_API_KEY
   # Paste your key when prompted
   ```

6. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## After Deployment

Your app will be live at: `https://your-project.vercel.app`

### Test It:
1. Visit your URL
2. Enter a prompt like "Create a simple todo app"
3. Watch the generation happen in a Daytona sandbox
4. Get a preview URL to see your generated site

## Important Notes

- **API Routes**: The generation happens server-side, so your API keys are secure
- **Timeouts**: Vercel functions have a 5-minute timeout (already configured in `vercel.json`)
- **Environment Variables**: Never commit your `.env` file - always use Vercel's environment variable settings
- **Custom Domain**: You can add a custom domain in Vercel's project settings

### ⚠️ Daytona Integration Limitation

**The `/api/generate-daytona` endpoint is NOT available on Vercel** due to serverless environment limitations:
- Vercel's serverless functions don't support `child_process.spawn`
- Daytona sandbox creation requires running external scripts

**Solutions:**
1. **Use `/api/generate` endpoint** - Works on Vercel, generates code directly
2. **Run locally** - The Daytona integration works perfectly in local development (`npm run dev`)
3. **Deploy to a different platform** - Consider Railway, Render, or Fly.io which support full Node.js environments

For most use cases, the `/api/generate` endpoint provides sufficient functionality for code generation on Vercel.

## Troubleshooting

### Build Fails
- Check that your `package.json` has all dependencies
- Run `npm install` and `npm run build` locally first

### API Errors
- Verify environment variables are set in Vercel dashboard
- Check Vercel function logs: Dashboard → Your Project → Deployments → View Function Logs

### Generation Timeout
- The API route has a 5-minute timeout (300 seconds)
- For complex generations, this might need adjustment

## Updating Your Deployment

Every time you push to your GitHub repository:
- Vercel automatically rebuilds and deploys
- No manual redeployment needed!

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
