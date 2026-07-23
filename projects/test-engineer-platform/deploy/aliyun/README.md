# 阿里云 ECS 部署说明

目标服务器：`121.40.26.169`

当前已生成两个部署包：

- `deploy-test-engineer.tar.gz`：精简运行包，约 5 MB，不含 `open-source/` 源码库。
- `deploy-test-engineer-full.tar.gz`：全量包，约 493 MB，含 `open-source/` 源码库。

建议先部署精简运行包。开源项目源码已推送到 GitHub 大仓：

`https://github.com/whb786200/whb786200/tree/main/projects/test-engineer-platform`

## 前置检查

在阿里云控制台确认：

1. ECS 实例正在运行。
2. 安全组放行入方向 TCP `22`、`80`、`3001`。
3. 服务器系统 SSH 服务已启动。
4. 如果 SSH 不是 22 端口，修改本目录脚本中的 `SSH_PORT`。

本机验证：

```powershell
ssh root@121.40.26.169 "echo ok"
```

如果提示 `Connection refused`，说明服务器端口未开放或 SSH 服务未运行，需要先在阿里云控制台修复。

## 部署方式

在 Windows 本机项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\aliyun\push-and-install.ps1
```

脚本会完成：

1. 上传 `deploy-test-engineer.tar.gz` 到服务器 `/opt/test-engineer/`。
2. 上传服务器安装脚本 `install-on-server.sh`。
3. 在服务器解压应用、安装依赖、配置 systemd 服务。
4. 启动 `test-engineer` 服务，监听 `3001` 端口。

部署完成后访问：

`http://121.40.26.169:3001/`

## 常用服务器命令

```bash
systemctl status test-engineer
journalctl -u test-engineer -n 100 --no-pager
systemctl restart test-engineer
```

## 可选 Nginx 反代

如需使用 80 端口访问，可安装 Nginx 并配置反代到 `127.0.0.1:3001`。当前脚本不强制安装 Nginx，避免破坏服务器已有站点配置。
