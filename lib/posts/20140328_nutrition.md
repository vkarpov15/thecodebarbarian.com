As much as I love geeking out about [basketball stats](http://thecodebarbarian.com/2014/02/14/crunching-30-years-of-nba-data-with-mongodb-aggregation/), I want to put a MongoDB data set out there that's a bit more app-friendly: the [USDA SR25 nutrient database](http://www.ars.usda.gov/Services/docs.htm?docid=22771). You can download this data set from my S3 bucket [here](https://s3.amazonaws.com/valeri.karpov.mongodb/usda.nutrition.tgz), and plug it into your MongoDB instance using [mongorestore](http://docs.mongodb.org/manual/reference/program/mongorestore/). I'm very meticulous about nutrition and have, at times, kept a food journal, but sites like FitDay and DailyBurn have far too much spam and are far too poorly designed to be a viable option. With this data set, I plan on putting together an open source web-based food journal in the near future. However, I encourage you to use this data set to build your own apps.

Data Set Structure
------------------

The data set contains one collection, 'nutrition'. The documents in this collection contain merged data from the SR25 database's very relational `FOOD_DES`, `NUTR_DEF`, `NUT_DATA`, and `WEIGHT` files. In more comprehensible terms, the documents contain a description of a food item, a list of nutrients with measurements per 100g, and a list of common serving sizes for that food. Here's what the top level document for grass-fed ground bison looks like in [RoboMongo](http://robomongo.org/), a simple MongoDB GUI:

[<img src="//lh4.googleusercontent.com/tNPP4aIiKIchCQr4fFZXaW8sY33pKtdjAc1-tnRHNeRAlyjwEBItOUHOZw1kCH72FTFdiyBmqVQbFFVcOGtmj7GyH5NEvgOzvuCSQ5IQ8zTlGoPCLcvi39J8WbxMBQ" style="width: 100%">](https://lh4.googleusercontent.com/tNPP4aIiKIchCQr4fFZXaW8sY33pKtdjAc1-tnRHNeRAlyjwEBItOUHOZw1kCH72FTFdiyBmqVQbFFVcOGtmj7GyH5NEvgOzvuCSQ5IQ8zTlGoPCLcvi39J8WbxMBQ)

The top level document is fairly simple: the description is a human-readable description of the food, the manufacturer is the company that manufactures the product, and survey is whether or not the data set has values for the 65 nutrients used for some government survey. However, the real magic happens in the `nutrients` and `weights` subdocuments. Lets see what happens when we open up nutrients:

[<img src="//lh6.googleusercontent.com/A3tf3xiM84bihdvYlNXNWFV3XwSkcmZkCyIj-1OIYS19QLznkm-ASsP7yEmJ3NZiihUyZgrhg0MRsiwrVVu4bcHbfrsP9m41ucB0Jkdsg1VGwL6ykaxTe6vBjoMCYA" style="width:100%">](https://lh6.googleusercontent.com/A3tf3xiM84bihdvYlNXNWFV3XwSkcmZkCyIj-1OIYS19QLznkm-ASsP7yEmJ3NZiihUyZgrhg0MRsiwrVVu4bcHbfrsP9m41ucB0Jkdsg1VGwL6ykaxTe6vBjoMCYA)

You'll see that there are an incredible amount of nutrients. The nutrients data is in an array, where each subdocument in the array has a tagname, which is a common scientific abbreviation for the nutrient, a human-readable description, and an `amountPer100G` with corresponding units. In the above example, you'll see that 100 grams of cooked grass-fed ground bison contains about 25.45 g of protein.

*(Note: the original data set includes some more detailed data, including standard deviations and sample sizes for the nutrient measurements, but that's outside the scope of what I want to do with this data set. If you want that data, feel free to read through the government data set's [documentation](https://www.ars.usda.gov/SP2UserFiles/Place/12354500/Data/SR25/sr25_doc.pdf) and fork my converter on [Github](https://github.com/vkarpov15/usda-sr25-mongodb).)*

Finally, the weights subdocument is another array which contains sub-documents that describe common serving sizes for the food item and their mass in grams. In the grass-fed ground bison example, the weights list contains a single serving size, 3 oz, which approximately 85 grams:

[<img src="//lh5.googleusercontent.com/ELPOrexYEHScEoZJbF9XNHG5HzDL5CId8Bm2OjpX7ZZ8yMpgAuQ2OtB65ahZvt9nYjePYn2a1KY5TGs7ClD5RaFPNgY1r8vUdSIkZXG3lOeps5i2O7D6iPervqZINQ" style="width:100%">](https://lh5.googleusercontent.com/ELPOrexYEHScEoZJbF9XNHG5HzDL5CId8Bm2OjpX7ZZ8yMpgAuQ2OtB65ahZvt9nYjePYn2a1KY5TGs7ClD5RaFPNgY1r8vUdSIkZXG3lOeps5i2O7D6iPervqZINQ)

Exploring the Data Set
----------------------

First things first: since the nutrients for each food are in an array, its not immediately obvious what nutrients this data set has. Thankfully, MongoDB's [`distinct` command](http://docs.mongodb.org/manual/reference/method/db.collection.distinct/) makes this very easy:

[<img src="//lh5.googleusercontent.com/yNabwRmSKb5O8ONqXsdxvmmdc595kHHy2Odctpik_EQdJWHuBL2iHaSNyTN80cx9-t_x77bjzBo_MpxvkgB14F6pKqo7kTjJwQs3r0m5l9XQsM5KrlNIPgTcnPyyUA" style="width: 100%">](https://lh5.googleusercontent.com/yNabwRmSKb5O8ONqXsdxvmmdc595kHHy2Odctpik_EQdJWHuBL2iHaSNyTN80cx9-t_x77bjzBo_MpxvkgB14F6pKqo7kTjJwQs3r0m5l9XQsM5KrlNIPgTcnPyyUA)

There are a lot of different nutrients in this data set. In fact, there are 145:

[<img src="//lh6.googleusercontent.com/VpyVV8kSSvvbTlH5Z_oPFMX9tYRTOtgCxNnRAQqS-Or7zBhEr6eS0FKAKCnPI2mw3y0_DVBTUxcCG4kWxpVbser3Uqc5EwbVgGPZV7mZcH_CBmFfFaQhO8KHLwnE9A" style="width: 100%">](https://lh6.googleusercontent.com/VpyVV8kSSvvbTlH5Z_oPFMX9tYRTOtgCxNnRAQqS-Or7zBhEr6eS0FKAKCnPI2mw3y0_DVBTUxcCG4kWxpVbser3Uqc5EwbVgGPZV7mZcH_CBmFfFaQhO8KHLwnE9A)

So how are we going to find nutrient data for a food that we're interested in? Suppose we're looking to find how many carbs are in raw kale. Pretty easy to do because MongoDB's shell supports JavaScript regular expressions, so lets just find documents where the description includes 'kale':

[<img src="//lh5.googleusercontent.com/IqOvCOauNJiWkRTZGcXEQI9ALgEcCuDhBv-fF4QAB4rZPsQtj9p522fDzSuE87p9INFXJcJJWWnQyKn3nd1dhNkhj3HjypjtzA0i3OESEbj4T6_4dwYeiXB74cg64w" style="width: 100%">](https://lh5.googleusercontent.com/IqOvCOauNJiWkRTZGcXEQI9ALgEcCuDhBv-fF4QAB4rZPsQtj9p522fDzSuE87p9INFXJcJJWWnQyKn3nd1dhNkhj3HjypjtzA0i3OESEbj4T6_4dwYeiXB74cg64w)

Of course, this doesn't include the carbohydrate content, so lets add a [`$elemMatch`](http://docs.mongodb.org/manual/reference/operator/projection/elemMatch/) to the projection to limit output to the carbohydrates in raw kale:

[<img src="//lh4.googleusercontent.com/ZGA8mEoYPBV-haWVTiAfd3bzoCT-Q5sM8UVe6B6qCsXA3WH3_xpnB4EiwgmuvAnYB_J8i0k-zcLdnCEVnWkf9iogJ37_ou099nVwHI_mEXInI20Ll4dG6Ns46UnynQ" style="width: 100%">](https://lh4.googleusercontent.com/ZGA8mEoYPBV-haWVTiAfd3bzoCT-Q5sM8UVe6B6qCsXA3WH3_xpnB4EiwgmuvAnYB_J8i0k-zcLdnCEVnWkf9iogJ37_ou099nVwHI_mEXInI20Ll4dG6Ns46UnynQ)

Running Aggregations to Test Nutritional Claims
------------------------------

My favorite burger joint in Chelsea, [brgr](http://www.brgr.com/), claims that grass-fed beef has as much omega-3 as salmon. Lets see if this advertising claim holds up to scrutiny:

[<img src="//lh5.googleusercontent.com/jVkMCUV581YZBjdhwE87XLrIl5IJu9CJtiqmo7_2DL3rUZEZHcvvCA4sOjxchkzIs79foXvLEntKur7qqfEBfcOC95ilFvOYRtrsJ7WtoIIia3q5C17PfeK9QEaV_w" style="width: 300px">](https://lh5.googleusercontent.com/jVkMCUV581YZBjdhwE87XLrIl5IJu9CJtiqmo7_2DL3rUZEZHcvvCA4sOjxchkzIs79foXvLEntKur7qqfEBfcOC95ilFvOYRtrsJ7WtoIIia3q5C17PfeK9QEaV_w)

Right now, this is a bit tricky. Since I imported the data from the USDA as-is, total omega-3 fatty acids is not tracked as a single nutrient. The amounts for individual omega-3 fatty acids, such as EPA and DHA, are recorded separately. However, the different types of [omega-3 fatty acids all have n-3](http://en.wikipedia.org/wiki/Omega-3_fatty_acid) in the description, so it should be pretty easy to identify which nutrients we need to sum up to get total omega-3 fatty acids. Of course, when you need to significantly transform your data, its time to bust out the [MongoDB aggregation framework](http://docs.mongodb.org/manual/core/aggregation/).

The first aggregation we're going to do is find the salmon item that has the least amount of total omega-3 fatty acids per 100 grams. To do that, we first need to transform the documents to include the total amount of omega-3's, rather than the individual omega-3 fats like EPA and DHA. With the [$group](http://docs.mongodb.org/manual/reference/operator/aggregation/group/) pipeline state and the [$sum](http://docs.mongodb.org/manual/reference/operator/aggregation/sum/) operator, this is pretty simple. Keep in mind that the nutrient descriptions for omega-3 fatty acids are always in grams in this data set, so we don't have to worry about unit conversions.

[<img src="//lh4.googleusercontent.com/E635l_A4tZYqDcM6sxSNVIJvExgHur_N7jnvlMpt8M68KJ9nwjm3WhZ65eKJPZ9aELKxPNAcRGsVASJ8vlDrsPjfsxiGhwTn6I9gS99BHq6P-mKl-GLbRPOpz5WlxA" style="width: 100%">](https://lh4.googleusercontent.com/E635l_A4tZYqDcM6sxSNVIJvExgHur_N7jnvlMpt8M68KJ9nwjm3WhZ65eKJPZ9aELKxPNAcRGsVASJ8vlDrsPjfsxiGhwTn6I9gS99BHq6P-mKl-GLbRPOpz5WlxA)

[<img src="//lh6.googleusercontent.com/jeXUgJl6Vd-PXCnMHoc0f2X20NfIxchL1iovc8lRkTTqMriyY6q2uwr7yi0acS7NB7GfJiRlO83Tu3UAI3wZ-vEYHVcJEPc7e-s928ysy8ONJ_IK_hx2kwo1w85p0Q" style="width: 100%">](https://lh6.googleusercontent.com/jeXUgJl6Vd-PXCnMHoc0f2X20NfIxchL1iovc8lRkTTqMriyY6q2uwr7yi0acS7NB7GfJiRlO83Tu3UAI3wZ-vEYHVcJEPc7e-s928ysy8ONJ_IK_hx2kwo1w85p0Q)

You can get a text version of the above aggregation on [Github](https://github.com/vkarpov15/usda-sr25-mongodb/blob/master/lowest_omega3_salmon.mongo.js). To verify brgr's claim, lets run the same aggregation for grass-fed ground beef, but reversing the sort order.

[<img src="https://lh3.googleusercontent.com/k6d_qxZ9i_3Hla4Pvd5rWOvQMsTf4v5yTo2e0FazplwcI92M9NIxPok9g3r0os4l4znNZKN0Z-LH4ZHLBfxqfnklsX8Ozm6uwJxtrvbcLKis7Ops_kAT6UpiWuNI9A" style="width: 100%">](https://lh3.googleusercontent.com/k6d_qxZ9i_3Hla4Pvd5rWOvQMsTf4v5yTo2e0FazplwcI92M9NIxPok9g3r0os4l4znNZKN0Z-LH4ZHLBfxqfnklsX8Ozm6uwJxtrvbcLKis7Ops_kAT6UpiWuNI9A)

[<img src="https://lh4.googleusercontent.com/HicToy8HhXSnSqtirX1t8yr6ryoCcgv5YGUmmKnmB4n9xc2gv28gmGa6qcM125z2P8qzadwKAsMlowGrkoByDjqvUWqurTYkO5B1y9lm9cbKTN0hyk2cLG52I3OSIw" style="width: 100%">](https://lh4.googleusercontent.com/HicToy8HhXSnSqtirX1t8yr6ryoCcgv5YGUmmKnmB4n9xc2gv28gmGa6qcM125z2P8qzadwKAsMlowGrkoByDjqvUWqurTYkO5B1y9lm9cbKTN0hyk2cLG52I3OSIw)

Looks like brgr's claim doesn't quite hold up to a cursory glance. I'd be curious to see what the basis for their claim is, specifically if they assume a smaller serving size for salmon than for grass-fed beef.

Conclusion
------------

Phew, that was a lot of information to cram into one post. The data set, as provided by the USDA, is a bit complex and could really benefit from some simplification. Thankfully, MongoDB 2.6 is coming out soon, and, with it, the [`$out` aggregation operator](http://docs.mongodb.org/master/reference/operator/aggregation/out/). The `$out` operator will enable you to pipe output from the aggregation framework to a separate collection, so I'll hopefully be able to add total omega-3 fatty acids as a nutrient, among other things. Once again, feel free to download the data set [here](https://s3.amazonaws.com/valeri.karpov.mongodb/usda.nutrition.tgz) (or check out the converter repo on [Github](https://github.com/vkarpov15/usda-sr25-mongodb)) and use it to build some awesome nutritional apps.
