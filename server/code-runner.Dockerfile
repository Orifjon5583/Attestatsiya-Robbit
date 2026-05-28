FROM python:3.12-alpine

RUN adduser -D -H -u 10001 runner
USER runner
WORKDIR /sandbox

CMD ["python", "-I", "-S", "/sandbox/runner.py"]
