# GitHub Actions CI/CD Templates

Reference implementations for CI/CD pipelines.

## Basic CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --coverage

      - uses: codecov/codecov-action@v3
        if: always()

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
```

## Deploy to Vercel (Frontend)

```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
          vercel-args: '--prod'
```

## Deploy to Railway (Backend)

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - working-directory: backend
        run: |
          npm ci
          npm run lint
          npm run test

  deploy:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend
```

## Full Stack Monorepo

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            frontend:
              - 'frontend/**'
            backend:
              - 'backend/**'

  test-frontend:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  test-backend:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

  deploy:
    needs: [test-frontend, test-backend]
    if: github.ref == 'refs/heads/main' && always() && !contains(needs.*.result, 'failure')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Frontend
        if: needs.changes.outputs.frontend == 'true'
        run: echo "Deploy frontend to Vercel"
      - name: Deploy Backend
        if: needs.changes.outputs.backend == 'true'
        run: echo "Deploy backend to Railway"
```

## Environment Protection

```yaml
# In deploy job, add environment for protection rules
deploy-production:
  runs-on: ubuntu-latest
  environment:
    name: production
    url: https://your-app.com
  steps:
    - name: Deploy
      run: echo "Deploying to production"
```

## Proof Artifact Enforcement Pipeline

CI/CD pipeline that enforces proof artifact requirements for gate approvals.
Uses the Multi-Agent Product Creator's proof artifact system.

```yaml
# .github/workflows/ci-with-proofs.yml
name: CI with Proof Artifacts

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  # ========================================
  # Gate 5: Build & Lint Verification
  # ========================================
  gate-5-build:
    name: 'G5: Build & Lint'
    runs-on: ubuntu-latest
    outputs:
      build_artifact_id: ${{ steps.build.outputs.artifact_id }}
      lint_artifact_id: ${{ steps.lint.outputs.artifact_id }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run build and capture proof
        id: build
        run: |
          mkdir -p .truth/proofs/G5
          npm run build 2>&1 | tee .truth/proofs/G5/build-output.txt
          BUILD_EXIT=${PIPESTATUS[0]}
          echo "exit_code=$BUILD_EXIT" >> $GITHUB_OUTPUT
          if [ $BUILD_EXIT -eq 0 ]; then
            echo "pass_fail=pass" >> $GITHUB_OUTPUT
            echo "summary=✅ Build succeeded" >> $GITHUB_OUTPUT
          else
            echo "pass_fail=fail" >> $GITHUB_OUTPUT
            echo "summary=❌ Build failed" >> $GITHUB_OUTPUT
            exit $BUILD_EXIT
          fi
          # Generate artifact ID
          BUILD_HASH=$(sha256sum .truth/proofs/G5/build-output.txt | cut -d' ' -f1)
          echo "artifact_id=build-${BUILD_HASH:0:8}" >> $GITHUB_OUTPUT

      - name: Run lint and capture proof
        id: lint
        run: |
          npm run lint 2>&1 | tee .truth/proofs/G5/lint-output.txt
          LINT_EXIT=${PIPESTATUS[0]}
          echo "exit_code=$LINT_EXIT" >> $GITHUB_OUTPUT
          if [ $LINT_EXIT -eq 0 ]; then
            echo "pass_fail=pass" >> $GITHUB_OUTPUT
            echo "summary=✅ Lint passed (0 errors)" >> $GITHUB_OUTPUT
          else
            echo "pass_fail=fail" >> $GITHUB_OUTPUT
            ERRORS=$(grep -c "error" .truth/proofs/G5/lint-output.txt || echo "0")
            echo "summary=❌ Lint failed ($ERRORS errors)" >> $GITHUB_OUTPUT
            exit $LINT_EXIT
          fi
          LINT_HASH=$(sha256sum .truth/proofs/G5/lint-output.txt | cut -d' ' -f1)
          echo "artifact_id=lint-${LINT_HASH:0:8}" >> $GITHUB_OUTPUT

      - name: Upload G5 proof artifacts
        uses: actions/upload-artifact@v4
        with:
          name: g5-proof-artifacts
          path: .truth/proofs/G5/
          retention-days: 90

  # ========================================
  # Gate 6: Test & Coverage Verification
  # ========================================
  gate-6-tests:
    name: 'G6: Tests & Coverage'
    runs-on: ubuntu-latest
    needs: gate-5-build
    outputs:
      test_artifact_id: ${{ steps.test.outputs.artifact_id }}
      coverage_artifact_id: ${{ steps.coverage.outputs.artifact_id }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests and capture proof
        id: test
        run: |
          mkdir -p .truth/proofs/G6
          npm run test -- --coverage 2>&1 | tee .truth/proofs/G6/test-output.txt
          TEST_EXIT=${PIPESTATUS[0]}
          echo "exit_code=$TEST_EXIT" >> $GITHUB_OUTPUT
          if [ $TEST_EXIT -eq 0 ]; then
            echo "pass_fail=pass" >> $GITHUB_OUTPUT
            PASSED=$(grep -oP '\\d+ passed' .truth/proofs/G6/test-output.txt | head -1 || echo "Tests passed")
            echo "summary=✅ $PASSED" >> $GITHUB_OUTPUT
          else
            echo "pass_fail=fail" >> $GITHUB_OUTPUT
            FAILED=$(grep -oP '\\d+ failed' .truth/proofs/G6/test-output.txt | head -1 || echo "Tests failed")
            echo "summary=❌ $FAILED" >> $GITHUB_OUTPUT
            exit $TEST_EXIT
          fi
          TEST_HASH=$(sha256sum .truth/proofs/G6/test-output.txt | cut -d' ' -f1)
          echo "artifact_id=test-${TEST_HASH:0:8}" >> $GITHUB_OUTPUT

      - name: Extract coverage report
        id: coverage
        run: |
          if [ -f coverage/coverage-summary.json ]; then
            cp coverage/coverage-summary.json .truth/proofs/G6/coverage-report.json
            LINES=$(jq '.total.lines.pct' coverage/coverage-summary.json)
            BRANCHES=$(jq '.total.branches.pct' coverage/coverage-summary.json)
            echo "pass_fail=pass" >> $GITHUB_OUTPUT
            echo "summary=Coverage: ${LINES}% lines, ${BRANCHES}% branches" >> $GITHUB_OUTPUT
            COV_HASH=$(sha256sum .truth/proofs/G6/coverage-report.json | cut -d' ' -f1)
            echo "artifact_id=coverage-${COV_HASH:0:8}" >> $GITHUB_OUTPUT
          else
            echo "pass_fail=warning" >> $GITHUB_OUTPUT
            echo "summary=No coverage report generated" >> $GITHUB_OUTPUT
          fi

      - name: Upload G6 proof artifacts
        uses: actions/upload-artifact@v4
        with:
          name: g6-proof-artifacts
          path: .truth/proofs/G6/
          retention-days: 90

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        if: always()

  # ========================================
  # Gate 7: Security Scan
  # ========================================
  gate-7-security:
    name: 'G7: Security Scan'
    runs-on: ubuntu-latest
    needs: gate-5-build
    outputs:
      security_artifact_id: ${{ steps.audit.outputs.artifact_id }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run security audit and capture proof
        id: audit
        run: |
          mkdir -p .truth/proofs/G7
          npm audit --json > .truth/proofs/G7/security-scan.json 2>&1 || true
          VULNS=$(jq '.metadata.vulnerabilities | .critical + .high' .truth/proofs/G7/security-scan.json)
          if [ "$VULNS" -eq 0 ] 2>/dev/null; then
            echo "pass_fail=pass" >> $GITHUB_OUTPUT
            echo "summary=✅ No critical/high vulnerabilities" >> $GITHUB_OUTPUT
          else
            echo "pass_fail=warning" >> $GITHUB_OUTPUT
            echo "summary=⚠️ $VULNS critical/high vulnerabilities found" >> $GITHUB_OUTPUT
          fi
          SEC_HASH=$(sha256sum .truth/proofs/G7/security-scan.json | cut -d' ' -f1)
          echo "artifact_id=security-${SEC_HASH:0:8}" >> $GITHUB_OUTPUT

      - name: Upload G7 proof artifacts
        uses: actions/upload-artifact@v4
        with:
          name: g7-proof-artifacts
          path: .truth/proofs/G7/
          retention-days: 90

  # ========================================
  # Generate Proof Report
  # ========================================
  proof-report:
    name: 'Generate Proof Report'
    runs-on: ubuntu-latest
    needs: [gate-5-build, gate-6-tests, gate-7-security]
    if: always()
    steps:
      - uses: actions/checkout@v4

      - name: Download all proof artifacts
        uses: actions/download-artifact@v4
        with:
          path: .truth/proofs/

      - name: Generate consolidated proof report
        run: |
          cat > proof-report.md << 'EOF'
          # Proof Artifact Report

          Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
          Commit: ${{ github.sha }}
          Branch: ${{ github.ref_name }}

          ## Gate 5: Build & Lint
          - Build: ${{ needs.gate-5-build.outputs.build_artifact_id || 'N/A' }}
          - Lint: ${{ needs.gate-5-build.outputs.lint_artifact_id || 'N/A' }}

          ## Gate 6: Tests & Coverage
          - Tests: ${{ needs.gate-6-tests.outputs.test_artifact_id || 'N/A' }}
          - Coverage: ${{ needs.gate-6-tests.outputs.coverage_artifact_id || 'N/A' }}

          ## Gate 7: Security
          - Audit: ${{ needs.gate-7-security.outputs.security_artifact_id || 'N/A' }}

          ## Artifacts Location
          All proof artifacts are stored in GitHub Actions artifacts with 90-day retention.
          EOF
          cat proof-report.md

      - name: Upload proof report
        uses: actions/upload-artifact@v4
        with:
          name: proof-report
          path: proof-report.md
          retention-days: 90

  # ========================================
  # Deploy (only on main, after all gates pass)
  # ========================================
  deploy:
    name: 'Deploy to Production'
    runs-on: ubuntu-latest
    needs: [gate-5-build, gate-6-tests, gate-7-security]
    if: github.ref == 'refs/heads/main' && !contains(needs.*.result, 'failure')
    environment:
      name: production
      url: https://your-app.com
    steps:
      - uses: actions/checkout@v4

      - name: Verify all gate proofs exist
        run: |
          echo "Verifying gate proofs before deployment..."
          echo "G5 Build: ${{ needs.gate-5-build.outputs.build_artifact_id }}"
          echo "G5 Lint: ${{ needs.gate-5-build.outputs.lint_artifact_id }}"
          echo "G6 Tests: ${{ needs.gate-6-tests.outputs.test_artifact_id }}"
          echo "G7 Security: ${{ needs.gate-7-security.outputs.security_artifact_id }}"

          # Fail if any required proof is missing
          if [ -z "${{ needs.gate-5-build.outputs.build_artifact_id }}" ]; then
            echo "❌ Missing G5 build proof - deployment blocked"
            exit 1
          fi
          if [ -z "${{ needs.gate-6-tests.outputs.test_artifact_id }}" ]; then
            echo "❌ Missing G6 test proof - deployment blocked"
            exit 1
          fi
          echo "✅ All required gate proofs verified"

      - name: Deploy to Vercel
        run: |
          echo "Deploying to production..."
          # Add actual deployment commands here
          # npx vercel --prod
```

## Proof Artifact Verification Script

Add this script to your project for local proof verification:

```bash
#!/bin/bash
# scripts/verify-proofs.sh
# Verify proof artifacts exist before deployment

set -e

PROOF_DIR=".truth/proofs"
REQUIRED_GATES=("G5" "G6" "G7" "G8")

echo "🔍 Verifying proof artifacts..."

for gate in "${REQUIRED_GATES[@]}"; do
  GATE_DIR="$PROOF_DIR/$gate"
  if [ ! -d "$GATE_DIR" ]; then
    echo "❌ Missing proof directory: $GATE_DIR"
    exit 1
  fi

  PROOF_COUNT=$(find "$GATE_DIR" -type f | wc -l)
  if [ "$PROOF_COUNT" -eq 0 ]; then
    echo "❌ No proof artifacts in $GATE_DIR"
    exit 1
  fi

  echo "✅ $gate: $PROOF_COUNT proof artifact(s)"
done

echo ""
echo "✅ All required proof artifacts verified"
```

## Secrets Required

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `RAILWAY_TOKEN` | Railway API token |
| `CODECOV_TOKEN` | Codecov upload token (optional for public repos) |
