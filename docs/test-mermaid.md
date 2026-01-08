# Mermaid 图表测试

这是一个测试文件，用于验证 CZON 中的 Mermaid 图表渲染功能。

## 流程图示例

```mermaid
graph TD
    A[开始] --> B{是否继续?}
    B -->|是| C[执行操作]
    B -->|否| D[结束]
    C --> E[检查结果]
    E --> F{是否成功?}
    F -->|是| G[完成]
    F -->|否| H[重试]
    H --> C
    G --> D
```

## 序列图示例

```mermaid
sequenceDiagram
    participant User
    participant System
    participant Database

    User->>System: 提交请求
    System->>Database: 查询数据
    Database-->>System: 返回结果
    System-->>User: 显示结果
```

## 甘特图示例

```mermaid
gantt
    title 项目时间表
    dateFormat  YYYY-MM-DD
    section 设计
    需求分析     :done,    des1, 2024-01-01, 7d
    原型设计     :active,  des2, 2024-01-08, 5d
    详细设计     :         des3, after des2, 5d
    section 开发
    前端开发     :         dev1, after des3, 10d
    后端开发     :         dev2, after des3, 15d
    section 测试
    单元测试     :         test1, after dev1, 5d
    集成测试     :         test2, after dev2, 5d
```

## 类图示例

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +void eat()
        +void sleep()
    }
    class Dog {
        +void bark()
    }
    class Cat {
        +void meow()
    }

    Animal <|-- Dog
    Animal <|-- Cat
```

## 状态图示例

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : 开始处理
    Processing --> Success : 处理成功
    Processing --> Error : 处理失败
    Success --> [*]
    Error --> [*]
```

## 饼图示例

```mermaid
pie title 浏览器使用率
    "Chrome" : 65.2
    "Firefox" : 15.3
    "Safari" : 12.5
    "Edge" : 5.2
    "其他" : 1.8
```

## 错误语法测试（应该显示错误信息）

```mermaid
graph TD
    A --> B
    // 这里缺少箭头定义
    C --> D
```

这个测试文件包含了多种 Mermaid 图表类型，用于验证 CZON 的 Mermaid 集成是否正常工作。
