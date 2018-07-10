FROM python:3.6
ENV PYTHONUNBUFFERED 1

RUN mkdir /www
ADD www /www
