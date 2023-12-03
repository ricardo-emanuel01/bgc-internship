# BGC Processo Seletivo - Desafio 2
Projeto desenvolvido para fins avaliativos para um processo seletivo de uma vaga de estágio na BGC Brasil

# Tarefa

Criar um sistema que retorne os três primeiros produtos da página de mais vendidos da [Amazon](https://amazon.com.br/bestsellers) e disponibilizar essa informação para ser consumida por uma API, utilizando NodeJS/Typescript + AWS + Serverless Framework.

# Design

Obter esses dados através de técnicas de *web scraping* e disponibilizar os dados que serão armazenados em uma tabela no *DynamoDB* através de uma API.

## O quê caracteriza um produto?

Com uma análise simples da página de mais vendidos da Amazon é possível verificar que todo item tem:

- Foto
- Título
- Avaliação
- Preço

Para fins de simplicidade decidi escolher categorias específicas e obter os seguintes dados dos 3 produtos mais vendidos de cada categoria:

- Título
- Preço
- Posição no ranking

E para a categoria **livros** também escolhi obter o nome do autor que é uma informação relevante de um livro. As categorias escolhidas foram:

- [Computadores e Informática](https://amazon.com.br/bestsellers/computers)
- [Eletrônicos](https://amazon.com.br/bestsellers/electronics)
- [Games e Consoles](https://amazon.com.br/bestsellers/videogames)
- [Livros](https://amazon.com.br/bestsellers/books)

## Com que frequência o ranking é atualizado?

Praticamente todas as repartições que fazem ranking de produtos no site da Amazon dizem com que frequência são atualizadas, por exemplo o ranking de produtos mais desejados e de produtos mais dados como presente dizem que se atualizam diariamente, porém o ranking de mais vendidos diz apenas que é "atualizado com frequência" e com uma pesquisa rápida é possível encontrar uma [página de atendimento ao cliente](https://www.amazon.com.br/gp/help/customer/display.html?nodeId=GGGMZK378RQPATDJ) que explica que esse ranking é atualizado de hora em hora e para fins de simplicidade pode ser conveniente verificar como ele foi na última hora do dia e considerar o ranking daquele momento para o dia todo.

## Esquema do banco de dados

### Informações relevantes sobre o levantamento feito abaixo

- O *DynamoDB* utiliza *Unicode* com codificação UTF-8 o quê significa que um caracter de uma **String** no banco de dados pode ocupar de 1 a 4 bytes de memória e como utilizamos apenas caracteres comuns como letras, números e símbolos mais comuns é possível considerar que cada caracter ocupará apenas 1 byte.  
- Atributos do tipo **Number** são aproximadamente o tamanho do nome do atributo + 1 byte para cada 2 dígitos significativos + 1 byte.  
- A conta de quanto espaço ocupa um item no *DynamoDB* deve considerar os nomes dos atributos e os seus valores.

### Aproximação do espaço ocupado


Como o [AWS DynamoDB](https://docs.aws.amazon.com/dynamodb/) é um banco de dados NoSQL não é necessário existir um esquema pré estabelicdo *on write*, o que nos permite uma flexidade maior ao trabalhar com objetos com estruturas diferentes, que nesse caso seria os objetos de livros em comparação com os demais. Contudo, os objetos terão estruturas semelhantes e serão caracterizados da seguinte forma. Todos os objetos terão os campos:

- ***itemId:*** Será um *Universally Unique Identifier* (UUID) representado por uma **String** (42 bytes)
- ***title:*** Será uma **String** com o título do produto no site (75 bytes em média)
- ***price:*** Será um **Number** com o preço do produto armazenado como um número inteiro para evitar possíveis inconsistências, portanto sempre deverá ser usado tendo em mente que ele contém duas casas decimais (Difícil saber quantos bytes consome mas de acordo com alguns artigos uma boa aproximação pode ser 10 bytes no máximo)
- ***dateOfInsertion:*** Será uma **String** contendo o dia em que os produtos representam os mais vendidos no format **AAAA-MM-DD** (25 bytes)
- ***category:*** Será uma **String** com o nome da categoria do produto que poderá ser *books, electronics, videogames* ou *computers* (no máximo 19 bytes)
- ***rankingMarket:*** Será uma **String** contendo a posição no ranking do produto (14 bytes)

E os livros conterão, além dos campos descritos acima o campo *author* que terá em média *26 bytes*.

É complicado prever o espaço consumido pelo tipo **Number** em uma tabela no DynamoDB por isso decidi utilizar **String** para representar o *rankingMarket* pois é necessário apenas 1 digito e portanto não atrapalha tarefas de ordenação o que aconteceria caso representasse o preço como uma **String**, pois ao ser ordenado lexicograficamente em ordem não decrescente, por exemplo, permitiria que valores monetários maiores aparecessem antes de valores menores, pelo fato de, dessa forma, "1234567" que representa R$12345,67 aparecer antes que "987" que representa R$9,87.  
Com isso podemos prever que em média serão incluídos no banco de dados cerca de **2298 bytes por dia**, desconsiderando o espaço ocupado por indexes.


## Proposta para a aplicação

Ter um script que obtenha os dados do site da Amazon com uma certa frequência e os coloque em uma tabela no *DynamoDB* e disponibilizar uma API pelo *AWS API Gateway* que aciona uma *AWS Lambda Function* que faz a query no banco de dados e os retorna em JSON.

### Script de scrapping

Poderia ser uma *AWS Lambda Function* que é acionada por um evento periódico controlado pelo *AWS EventBridge* ou então um script em uma máquina local que é acionado por um *cronjob*. Tendo em vista que um script de scrapping pode levar um tempo relativamente alto por utilizar navegadores headless e ter todo o overhead de abrir o navegador, executar a navegação e as respectivas queries e a cobrança em uma *AWS Lambda Function* acredito que seja mais simples e econômico utilizar *cronjob* para rodar o script de *scrapping*.  
Portanto defini uma tarefa no *cronjob* que é realizada todos os dias às 00:10h no horário de brasília que aciona o *script* de *scrapping* e atualiza a tabela no *DynamoDB* com os novos itens.

### API para consulta dos dados

É um endpoint que poderá conter parâmetros de *query* que serão usados para filtrar os dados da tabela, será possível utilizar 2 filtros, categoria e data de inserção, caso não seja passado nenhum dos dois parâmetros a API devolverá todos os items na tabela sem paginação, também é possível utilizar apenas um dos filtros por vez.

### Serverless framework para habilitar os serviços

Como decidi que o *script* de *scrapping* irá rodar em minha máquina localmente precisei habilitar apenas uma função, responsável por ser o recurso do *endpoint* da API e uma tabela no *DynamoDB*, também configurei um índice secundário que ajudará nas *queries* feitas pela API na tabela de itens.

#### AWS Lambda Function

Uma função que será acionada quando houver um requisição *GET* no endpoint */items* da aplicação e que recebe a permissão de modificar a tabela mantida com as representações dos produtos.

#### DynamoDB

Uma tabela no banco de dados com um índice secundário para habilitar *queries* melhores e com capacidade mínima pois serve apenas para fins avaliativos.

## Resultado

O endpoint da API, o modelo representacional de um item e da resposta da API para as requisições podem ser encontrados e testados através do [swagger](https://ricardo-emanuel01.github.io/bgc-internship-swagger).

- Exitem dados apenas do dia 30/11/2023 em diante

## Melhorias em potencial

- Refatoração do código quando estive mais experiente em JS
- Implementar paginação nos resultados da API
- Implementar algum tipo de restrição no acesso à API
- Implementar o tratamento do input de título dos produtos da amazon que as vezes podem ser pouco específicos
- Implementação de endpoints para obtenção de insights sobre os itens, como verificar se um produto diminuiu ou aumentou de preço, criação de alertas de diferença de preço que poderão ser enviados por email e etc.
- Diminuir o nome dos atributos da tabela para economizar espaço